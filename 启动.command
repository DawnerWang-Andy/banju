#!/bin/bash
# 半句 · Mac 一键启动（双击本文件；若提示权限，右键→打开）
cd "$(dirname "$0")"
echo "『半句』正在准备……"
if ! command -v node >/dev/null; then
  echo "⚠️  还没装 Node.js。请打开 https://nodejs.org 下载 LTS 版安装后，再双击本文件。"
  read -n 1 -s -r -p "按任意键退出"
  exit 1
fi
case "$PWD" in
  *Mobile\ Documents*)
    echo "⚠️  注意：你正从 iCloud 同步目录里运行，SQLite 可能报文件锁错误。建议把 banju 整个文件夹复制到 ~/projects 后再双击。"
    ;;
esac
if [ -d node_modules ]; then rm -rf node_modules 2>/dev/null; fi
[ -f .env ] || cp .env.example .env
echo "[1/4] 安装依赖（首次约一分钟）……"
npm install --no-audit --no-fund || { echo "依赖安装失败，把上面的报错截图发给 Claude"; read; exit 1; }
echo "[2/4] 建表……"
npx prisma db push || { echo "建表失败（多半是 iCloud 文件锁，见上面提示）"; read; exit 1; }
echo "[3/4] 准备示例内容……"
npx tsx prisma/seed.ts
echo "[4/4] 启动……5 秒后自动打开浏览器"
nohup npm run dev >/tmp/banju.log 2>&1 &
sleep 5
open http://localhost:3000
echo "已启动。管理员 banju-admin / 密码 banju-test-2026（见 .env）。"
echo "想停止：关掉这个窗口前执行 pkill -f 'next dev'。日志在 /tmp/banju.log"
read -n 1 -s -r -p "按任意键关闭本窗口（不会停止网站）"
