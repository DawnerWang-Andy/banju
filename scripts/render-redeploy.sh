#!/usr/bin/env bash
# 公开 Git 仓库的 Render 服务不装 GitHub webhook：push 之后用本脚本手动触发部署
set -euo pipefail
KEY="${RENDER_API_KEY:?需要 RENDER_API_KEY}"
SID="${SERVICE_ID:-srv-dbth35942hec73bfglag}"
PROXY="${HTTPS_PROXY:-http://127.0.0.1:7890}"
curl -sS --proxy "$PROXY" -X POST "https://api.render.com/v1/services/$SID/deploys" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" --data '{}' | head -c 200
echo
echo "已触发部署。进度：dashboard.render.com/web/$SID 或 GET /v1/services/$SID/deploys?limit=1"
