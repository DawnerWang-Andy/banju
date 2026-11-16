// 热度排序：分数 = (likeCount×3 + reviewCount×2) ÷ sqrt(年龄小时 + 2)
// 互评≥2 的作者新句 ×1.2 冷启动加权；同分新帖优先
export type RankInput = {
  likeCount: number;
  reviewCount: number;
  createdAt: Date | string;
  /** 该作者累计互评数（服务端批量查好后传入） */
  authorReviews?: number;
  createdAtRank: number; // 新→旧排名（大=新）；同分时保证新帖优先
};

export function hotScore(p: RankInput, now = Date.now()): number {
  const ageH = Math.max((now - new Date(p.createdAt).getTime()) / 3600000, 0);
  const base = (p.likeCount * 3 + p.reviewCount * 2) / Math.sqrt(ageH + 2);
  const warm = (p.authorReviews ?? 0) >= 2 ? 1.2 : 1;
  return base * warm;
}

export function rankByHot<T extends { createdAt: Date }>(items: T[], now = Date.now()): T[] {
  return items
    .map((it, i) => ({
      it,
      s: hotScore({ ...it, createdAtRank: i } as unknown as RankInput, now),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}

/** 取分数 top 段并打乱前段（让好句持续冒出来，也避免每次刷新完全同序） */
export function topThenShuffle<T>(arr: T[], shuffleHead = 30): T[] {
  const out = [...arr];
  const head = out.slice(0, Math.min(shuffleHead, out.length));
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...head, ...out.slice(head.length)];
}
