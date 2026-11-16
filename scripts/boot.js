// 容器启动引导：建表 → 首次自动灌种子 → 拉起服务（免手动进 shell）
const { execSync, spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");

(async () => {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  const p = new PrismaClient();
  let n = 0;
  try {
    n = await p.user.count();
  } finally {
    await p.$disconnect().catch(() => {});
  }
  if (n === 0) {
    console.log("首次部署：灌入种子数据…");
    try {
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
      console.log("种子完成（管理员账号见 .env 的 ADMIN_USERNAMES 与 SEED_PASSWORD）。");
    } catch (e) {
      console.error("种子失败（不影响启动）:", String(e).slice(0, 300));
    }
  }
  spawn("node", [".next/standalone/server.js"], { stdio: "inherit" });
})().catch((e) => {
  console.error("boot 失败:", e);
  process.exit(1);
});
