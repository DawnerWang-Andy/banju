# 半句 · v1.0

> 短视频化阅读的短文字社区：上下滑着刷别人的半句（哲思 / 段子 / 梗 / 随笔），人人创作，人人互评，话题擂台自动归并与分析，一对一私信。
> 设计语言「稿纸与朱印」，视觉标准见同目录《半句-v1.0-最终原型.html》。

## 一分钟跑起来

**最快方式：双击 `启动.command`**（若 macOS 拦截，右键→打开）。它会自动装依赖、建表、灌种子、起服务并打开浏览器。首次需要电脑装有 Node.js LTS（https://nodejs.org）。

<details>
<summary>手动四行命令版（等价）</summary>

```bash
# 前置：Node.js 20+；⚠️ 若文件夹里有 Linux 版 node_modules 先删掉
# ⚠️ 把项目挪出 iCloud（如 ~/projects/banju），SQLite 在网盘目录会锁失败
npm install
cp .env.example .env
npm run db:push      # 建表（生成 prisma/dev.db）
npm run db:seed      # 灌入示例句子、擂台、互评、敏感词
npm run dev          # 启动，监听 0.0.0.0:3000
```

</details>

打开 `http://localhost:3000`。种子账号：

| 角色 | 用户名 | 密码（=.env 的 SEED_PASSWORD） |
|---|---|---|
| 管理员 | `banju-admin` | `banju-test-2026` |
| 演示用户 | `banju-demo` | `banju-test-2026` |

**上线前必改：种子密码、`.env` 里的 `ADMIN_USERNAMES` 换成你自己的用户名。**

### 让同 WiFi 的同学都能访问（方式 A，开发期演示）

1. `npm run dev` 已绑定 `0.0.0.0`，无需额外参数。
2. 查本机 IP：Mac 系统设置→Wi-Fi→IP 地址；Windows 命令行 `ipconfig`。
3. 朋友手机连同一 WiFi，浏览器打开 `http://<你的IP>:3000`，可注册可发帖。

三个常见坑：
- **川大这类校园网开着 AP 隔离**，同 WiFi 下设备互访被网络策略禁止——不是网站坏了。解法：一台手机开热点，电脑连热点，再发 IP 地址。
- Windows 首次启动弹防火墙提示，要点「允许访问」。
- 局域网是明文 http，`.env` 保持 `COOKIE_SECURE=false`（true 会导致手机上根本登录不进去）。

## 部署

### 方式 B2 · 零成本公网起步（不用备案，任何网络可访问）

仓库推 GitHub → Render/Railway 新建 Web Service（原生识别 Dockerfile）→
再加一个免费 Postgres（Neon/Supabase 亦可，拿它的连接串）→ 设置环境变量：

```
DATABASE_URL=postgres://...      # 你的 Postgres 连接串
ADMIN_USERNAMES=<你的用户名>
COOKIE_SECURE=true
SEED_PASSWORD=<随机长密码>
PG_PASSWORD=<compose 用，本地可不管>
```

容器启动时自动 `prisma db push` 建表。首次发布记得跑一次种子：
`docker compose exec web npm run db:seed`（或在平台 console 里执行）。
免费档会休眠，第一个访问的人等 30–60 秒属正常。

### 方式 B1 · 正式归宿（国内学生云主机，域名 + 备案 + HTTPS）

```bash
# 服务器上
sudo apt install docker.io        # 或厂商一键装 Docker
git clone <你的仓库> banju && cd banju
cp .env.example .env              # 按 B2 的变量表填好，另加 PG_PASSWORD、NEXT_PUBLIC_SITE_URL
docker compose up -d --build      # web(3000) + postgres 一起起
# Caddy 反代自动 HTTPS：/etc/caddy/Caddyfile
#   yourdomain.cn { reverse_proxy 127.0.0.1:3000 }
# 每日备份 crontab：
#   15 3 * * * /path/banju/scripts/backup.sh >> /var/log/banju-backup.log 2>&1
```

**域名解析到国内服务器必须先完成 ICP 备案**（个人备案免费、约 1–2 周，云厂商有引导流程；没备案时 80/443 会被服务商拦截）。备案下来前可先用公网 IP + 3000 端口体验。

### 验收「任何网络可访问」

- [ ] 手机关掉 WiFi，用流量打开站点网址：刷句、盖赏、落评、发句、私信全流程正常
- [ ] 让外地同学打开同一网址并发一张截图
- [ ] `http://` 自动跳 `https://`

## 上线须知（法律与平台责任，务必读）

面向公网、任何人可注册的文字社区，涉及 **ICP 备案**与**内容主体责任**。本项目已内置上线门槛三件套（缺一不可，勿删）：

1. 公开内容：敏感词两级过滤（BLOCK→待审 / FILTER→替换 `*`）+ 举报 + 管理后台下架；
2. 私信：拉黑（双向拦截）+ 举报（管理员仅可见被举报的那条会话，无全站私信浏览入口——这是代码层面保证的隐私红线）+ 限流（60 条/小时、每天 5 个新会话）；
3. 限流防刷：登录 5 次/分、发布 10 条/时、开擂 3 个/天、论据每人每边 5 条。

同学小圈子演示问题不大；要公开推广，先了解校规与相关法规，量力而行。

## 结构与约定

- `app/` 页面与路由（Next 14 App Router，页面服务端取数、交互组件客户端）；`actions/` 全部写操作（server actions）；`lib/` 纯逻辑（热度公式、关键词引擎、敏感词、校验、限流、session）。
- 数据库开发用 SQLite，schema 保持两库兼容（无 enum、无数组字段）；生产由 `scripts/use-pg-schema.js` 一键切 Postgres。
- 品牌名集中改 `lib/brand.ts`；界面提示语集中 `lib/copy.ts`。
- 单测：`npm test`（关键词引擎、热度公式、服务端校验，12 项全过）。
- 端到端链路：完成 db:push + db:seed 后跑 `npx tsx tests-live.ts`——24 项检查覆盖登录、字符清洗、敏感词两级、待审隔离、盖赏幂等、互评透出、擂台选边、私信配对与双向拉黑、封禁拒登。
- 登录态自检：`curl -i localhost:3000/api/whoami`（觉得"像没登录"时先查它）。
- 交付状态：本仓库已在沙盒完整跑通——`next build` 零错误、生产 standalone 起服、带真实 session 的全部私有路由（/me /new /inbox /admin /api/convs /api/dm）实测 200。
- 动效纪律：只保留入场、落印反馈、比例条消长三类；`prefers-reduced-motion` 全关。

## 已知取舍（诚实清单）

- 类型 tab 时间线 v1 用热度同源接口，cursor 无限翻页留给下一迭代；
- 互评不盖楼、无站内通知（backlog）；
- 擂台自动分析用零依赖 bigram+Jaccard（无分词库、无 LLM），够小词表场景；要更聪明再接分词/摘要；
- PWA 图标未打包（manifest 无图标，安卓添加到主屏幕仍可用，iOS 用 Safari 分享→主屏幕）；
- 登录限流的 IP 维度简化为按用户名（middleware 级 IP 限速留给部署时按平台加）。
