#!/bin/sh
# 每日备份：docker compose 上下文里导出 Postgres，保留最近 7 天
# crontab 示例：15 3 * * * /path/to/banju/scripts/backup.sh >> /var/log/banju-backup.log 2>&1
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/backups"
mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M)"
docker compose -f "$DIR/docker-compose.yml" exec -T postgres pg_dump -U banju banju | gzip > "$OUT/banju-$STAMP.sql.gz"
ls -1t "$OUT"/banju-*.sql.gz | tail -n +8 | xargs -r rm -f
echo "backup ok: banju-$STAMP.sql.gz"
