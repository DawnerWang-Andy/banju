// 关键词引擎：标点分段 bigram + 停用词 + Jaccard 相似度
// 与原型 v1.0 的 bigrams()/topK()/jaccard() 逐一同源，纯函数无依赖、可直接单测
const STOP = new Set(
  "的了是我你他她它在有不这吗呢吧啊也和与就都要过很更还只把被让从对但如若为么什其因该等又也许那怎没啥们给着样个".split(
    ""
  )
);

export function bigrams(s: string): Map<string, number> {
  const segs = String(s || "").split(/[^一-龥]+/); // 按非汉字分段，杜绝跨词噪音
  const m = new Map<string, number>();
  for (const seg of segs) {
    for (let i = 0; i < seg.length - 1; i++) {
      const b = seg.slice(i, i + 2);
      if (STOP.has(b[0]) || STOP.has(b[1])) continue;
      m.set(b, (m.get(b) || 0) + 1);
    }
  }
  return m;
}

export function topK(s: string, n = 8): [string, number][] {
  return [...bigrams(s)].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function kwset(s: string): Set<string> {
  return new Set(topK(s, 20).map((x) => x[0]));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let u = 0;
  for (const w of a) if (b.has(w)) u++;
  return u / (a.size + b.size - u);
}

/** 话题签名：标题+背景+立场名的关键词集合 */
export function topicSigText(title: string, intro: string, proLabel: string, conLabel: string) {
  return `${title}${title}${title}${intro}${proLabel}${conLabel}`;
}
export function topicKwJson(title: string, intro: string, proLabel: string, conLabel: string) {
  return JSON.stringify(topK(topicSigText(title, intro, proLabel, conLabel), 20).map((x) => x[0]));
}
export function topicSigFromKwJson(json: string): Set<string> {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export const SUGGEST_THRESHOLD = 0.12; // 发起话题时的同类建议阈值
export const RELATED_THRESHOLD = 0.1; // 题页底部"同类擂台"阈值
