// 内存限流器：重启清零可接受（规格第 9 节）
type Bucket = { n: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { n: 1, resetAt: now + windowMs });
    return false;
  }
  b.n += 1;
  return b.n > max;
}

// 防泄漏：桶多了随手清一次过期
if (buckets.size > 5000) {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}
