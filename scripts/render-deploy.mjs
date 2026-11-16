#!/usr/bin/env node
// 半句 · Render 免费档一键部署：建 Web Service（Docker 运行时）→ 注入环境变量 → 轮询到 live → 冒烟检查
// 用法：
//   RENDER_API_KEY=rnd_xxx NEON_DATABASE_URL="postgresql://..." node scripts/render-deploy.mjs
// 可选环境变量：SERVICE_NAME / REGION(默认 singapore) / ADMIN_USERNAMES / OWNER_USERNAME /
//              OWNER_PASSWORD / SEED_PASSWORD / HTTPS_PROXY(本机直连 api.render.com 被墙时用)
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const API = "https://api.render.com/v1";
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || "";
const die = (m) => { console.error("❌ " + m); process.exit(1); };

const KEY = process.env.RENDER_API_KEY || die("缺少 RENDER_API_KEY");
const NEON = process.env.NEON_DATABASE_URL || die("缺少 NEON_DATABASE_URL（Neon 连接串）");
const NEON_DIRECT = process.env.NEON_DATABASE_URL_UNPOOLED || "";
if (!/^postgres(ql)?:\/\//.test(NEON)) die("NEON_DATABASE_URL 不像 Postgres 连接串");
const REGION = process.env.REGION || "singapore";
const ADMIN = process.env.ADMIN_USERNAMES || "wangyihan";
const OWNER_U = process.env.OWNER_USERNAME || ADMIN.split(",")[0].trim();
const OWNER_P = process.env.OWNER_PASSWORD || crypto.randomBytes(12).toString("base64url");
const SEED_P = process.env.SEED_PASSWORD || crypto.randomBytes(15).toString("base64url");
const REPO = process.env.REPO_URL || "https://github.com/DawnerWang-Andy/banju";

function api(method, p, body) {
  const args = ["-sS", "--max-time", "90", "-w", "\n%{http_code}", "-X", method, API + p,
    "-H", `Authorization: Bearer ${KEY}`, "-H", "Content-Type: application/json"];
  if (PROXY) args.push("--proxy", PROXY);
  if (body !== undefined) args.push("--data", JSON.stringify(body));
  const raw = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const i = raw.lastIndexOf("\n");
  const status = Number(raw.slice(i + 1));
  let json = null;
  try { json = JSON.parse(raw.slice(0, i)); } catch { json = raw.slice(0, i); }
  return { status, json };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const owners = api("GET", "/owners");
if (owners.status !== 200) die(`GET /owners 失败 ${owners.status}: ${JSON.stringify(owners.json).slice(0, 300)}`);
const owner = owners.json[0].owner || owners.json[0];
console.log(`✅ 账号：${owner.name || owner.email}（ownerId=${owner.id}）`);

const envVars = [
  { key: "DATABASE_URL", value: NEON },
  ...(NEON_DIRECT ? [{ key: "DATABASE_URL_UNPOOLED", value: NEON_DIRECT }] : []),
  { key: "ADMIN_USERNAMES", value: ADMIN },
  { key: "COOKIE_SECURE", value: "true" },
  { key: "SEED_PASSWORD", value: SEED_P },
  { key: "OWNER_USERNAME", value: OWNER_U },
  { key: "OWNER_PASSWORD", value: OWNER_P },
];

const candidates = [
  process.env.SERVICE_NAME, "banju", "banju-app", "banju-site",
  `banju-${crypto.randomBytes(2).toString("hex")}`,
].filter(Boolean);

let svc = null, usedName = null;
for (const name of candidates) {
  const body = {
    type: "web_service",
    name,
    ownerId: owner.id,
    repo: REPO,
    branch: "main",
    autoDeployTrigger: "commit",
    envVars,
    serviceDetails: {
      region: REGION,
      plan: "free",
      runtime: "docker",
      healthCheckPath: "/",
      envSpecificDetails: { dockerfilePath: "./Dockerfile" },
    },
  };
  const r = api("POST", "/services", body);
  if (r.status === 201 || r.status === 200) { svc = r.json.service || r.json; usedName = name; break; }
  console.log(`   名字 ${name} 不可用（${r.status}），换下一个…`);
}
if (!svc) die("创建服务失败（所有候选名都被占用或参数有误）");
console.log(`✅ 服务已创建：${usedName}（id=${svc.id}）`);

// 轮询部署状态
const t0 = Date.now();
let live = false, failed = null;
while (Date.now() - t0 < 25 * 60 * 1000) {
  const d = api("GET", `/services/${svc.id}/deploys?limit=1`);
  const dep = Array.isArray(d.json) ? d.json[0]?.deploy : d.json?.deploy;
  const st = dep?.status;
  const el = Math.round((Date.now() - t0) / 1000);
  console.log(`   [${el}s] deploy=${st || "?"}`);
  if (st === "live") { live = true; break; }
  if (st === "failed" || st === "canceled") { failed = dep; break; }
  await sleep(20000);
}
if (!live) die(`部署未成功：${JSON.stringify(failed || {}).slice(0, 400)}（到 Render 控制台看 Build Logs）`);

const detail = api("GET", `/services/${svc.id}`);
const url = detail.json?.service?.serviceDetails?.url || `https://${usedName}.onrender.com`;
console.log("✅ 部署 live，等待冷启动并冒烟检查…");
let code = 0;
for (let i = 0; i < 24; i++) {
  const args = ["-sS", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "40", url + "/"];
  code = Number(execFileSync("curl", args, { encoding: "utf8" }).trim());
  if (code === 200) break;
  await sleep(10000);
}
if (code !== 200) die(`站点冒烟失败（HTTP ${code}）：${url}`);

const cfgDir = path.join(os.homedir(), ".config", "banju");
fs.mkdirSync(cfgDir, { recursive: true });
const cfg = path.join(cfgDir, "render.env");
fs.writeFileSync(cfg, [
  "# 半句 · Render 正式环境凭证（勿提交）",
  `SITE_URL=${url}`,
  `SERVICE_ID=${svc.id}`,
  `SERVICE_NAME=${usedName}`,
  `REGION=${REGION}`,
  `ADMIN_USERNAMES=${ADMIN}`,
  `OWNER_USERNAME=${OWNER_U}`,
  `OWNER_PASSWORD=${OWNER_P}`,
  `SEED_PASSWORD=${SEED_P}`,
  "",
].join("\n"), { mode: 0o600 });

console.log("\n🎉 永久地址：" + url);
console.log(`   管理员：${OWNER_U} / ${OWNER_P}`);
console.log(`   凭证已存：${cfg}`);
