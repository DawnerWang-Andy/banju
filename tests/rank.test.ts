import { describe, expect, it } from "vitest";
import { hotScore, rankByHot, topThenShuffle } from "@/lib/rank";

const mk = (o: Partial<{ like: number; rev: number; ageH: number; authorReviews: number }>) => ({
  likeCount: o.like ?? 10,
  reviewCount: o.rev ?? 0,
  createdAt: new Date(Date.now() - (o.ageH ?? 1) * 3600000),
  authorReviews: o.authorReviews ?? 5,
});

describe("热度排序", () => {
  it("平方根衰减而非异或（SQLite ^ 陷阱的正解）", () => {
    // 2 个赞、0 评、2 小时龄：(2*3)/sqrt(2+2) = 3；作者评审≥2 → ×1.2 = 3.6
    expect(hotScore(mk({ like: 2, ageH: 2, authorReviews: 5 }))).toBeCloseTo(3.6, 5);
    expect(hotScore(mk({ like: 2, ageH: 2, authorReviews: 1 }))).toBeCloseTo(3.0, 5);
  });

  it("同赞数下，新帖优先", () => {
    const now = Date.now();
    const old = { ...mk({ like: 5 }), createdAt: new Date(now - 48 * 3600000) };
    const fresh = { ...mk({ like: 5 }), createdAt: new Date(now - 1 * 3600000) };
    expect(hotScore(fresh, now)).toBeGreaterThan(hotScore(old, now));
  });

  it("互评权重生效", () => {
    const withRev = mk({ like: 1, rev: 6, ageH: 1, authorReviews: 0 });
    const plain = mk({ like: 1, rev: 0, ageH: 1, authorReviews: 0 });
    expect(hotScore(withRev)).toBeGreaterThan(hotScore(plain));
  });

  it("rankByHot 输出顺序稳定可测 + topThenShuffle 保集合", () => {
    const items = [mk({ like: 1 }), mk({ like: 100 }), mk({ like: 10 })];
    const ranked = rankByHot(items as never);
    expect(ranked[0].likeCount).toBe(100);
    const shuffled = topThenShuffle(items, 2);
    expect(shuffled.length).toBe(items.length);
    expect(new Set(shuffled).size).toBe(new Set(items).size);
  });
});
