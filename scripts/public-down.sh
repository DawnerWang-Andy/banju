#!/usr/bin/env bash
# 停掉本机公网实例（隧道 + 容器；数据保留在 pgdata/）
set -euo pipefail
cd "$(dirname "$0")/.."
pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000" 2>/dev/null || true
if [ -f "$HOME/.config/banju/prod.env" ]; then
  set -a; . "$HOME/.config/banju/prod.env"; set +a
  export PG_PASSWORD
fi
docker compose down
echo "已停止。数据保留在 ./pgdata（Postgres）；再次上线跑 scripts/public-up.sh"
