#!/usr/bin/env bash
# 半句 · 本机公网实例：Docker（web + Postgres）+ cloudflared 快速隧道
# 零云账号、任何网络可访问；电脑不休眠即一直在线（临时方案，正式归宿见部署手册 B1/B2）。
set -euo pipefail
cd "$(dirname "$0")/.."

CFG="$HOME/.config/banju/prod.env"
if [ ! -f "$CFG" ]; then
  mkdir -p "$HOME/.config/banju"
  {
    echo "# 半句 · 本机公网实例运行环境（勿提交）"
    echo "DATABASE_URL=file:./prod.db"
    echo "ADMIN_USERNAMES=${ADMIN_USERNAMES:-wangyihan}"
    echo "COOKIE_SECURE=true"
    echo "SEED_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
    echo "PG_PASSWORD=$(openssl rand -hex 16)"
    echo "OWNER_USERNAME=${OWNER_USERNAME:-wangyihan}"
    echo "OWNER_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-18)"
  } > "$CFG"
  chmod 600 "$CFG"
  echo "已生成 $CFG（管理员账号/密码见其中 OWNER_* 两行）"
fi
set -a; . "$CFG"; set +a
export PG_PASSWORD ADMIN_USERNAMES COOKIE_SECURE SEED_PASSWORD

docker compose up -d --build
echo "等待容器建表与首次种子（约 10 秒）…"
sleep 12
docker compose exec -T -e OWNER_USERNAME="$OWNER_USERNAME" -e OWNER_PASSWORD="$OWNER_PASSWORD" \
  web node scripts/ensure-owner.js || echo "（管理员账号创建跳过：容器可能尚未就绪，稍后重跑本脚本即可）"

if ! pgrep -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000" >/dev/null 2>&1; then
  nohup cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000 > /tmp/banju-tunnel.log 2>&1 &
  echo "等待隧道建立…"
  sleep 12
fi
echo
echo "公网地址：$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/banju-tunnel.log | head -1)"
echo "管理员：$OWNER_USERNAME / 密码见 $CFG 的 OWNER_PASSWORD"
