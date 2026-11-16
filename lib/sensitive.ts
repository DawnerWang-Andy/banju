// 敏感词两级引擎：BLOCK / FILTER（词表小，contains 逐词即可；缓存 5 分钟）
import { prisma } from "./prisma";

type WordCache = { block: string[]; filter: string[]; at: number };
let cache: WordCache | null = null;
const TTL = 5 * 60 * 1000;

async function loadWords(): Promise<WordCache> {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const ws = await prisma.sensitiveWord.findMany();
  cache = {
    block: ws.filter((w) => w.level === "BLOCK").map((w) => w.word),
    filter: ws.filter((w) => w.level === "FILTER").map((w) => w.word),
    at: Date.now(),
  };
  return cache;
}

export function invalidateWordCache() {
  cache = null;
}

export type ScreenResult = {
  /** block: 命中违禁（公开内容→待审 / 私信与标题→拒绝发送） */
  hit: "clean" | "filter" | "block";
  text: string;
};

export async function screen(text: string): Promise<ScreenResult> {
  const { block, filter } = await loadWords();
  for (const w of block) {
    if (w && text.includes(w)) return { hit: "block", text };
  }
  let out = text;
  let filtered = false;
  for (const w of filter) {
    if (w && out.includes(w)) {
      out = out.split(w).join("*".repeat(w.length));
      filtered = true;
    }
  }
  return { hit: filtered ? "filter" : "clean", text: out };
}

/** 控制字符清洗：入库前统一处理（规格 9-3）；保留 \t 与换行 */
export function sanitizeControl(text: string): string {
  return text
    .split("")
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 9 || c === 10) return true; // tab、换行保留
      return c >= 32 && c !== 127; // 其余控制字符与 DEL 去除
    })
    .join("");
}
