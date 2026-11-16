// 相对时间："刚刚 / 5分钟前 / 3小时前 / 昨天 / 周二"
export function timeAgo(d: Date | string, now = Date.now()): string {
  const t = new Date(d).getTime();
  const diff = now - t;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 172800000) return "昨天";
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}天前`;
  const dt = new Date(t);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}
