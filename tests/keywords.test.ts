import { describe, expect, it } from "vitest";
import { bigrams, topK, kwset, jaccard, topicKwJson, topicSigFromKwJson } from "@/lib/keywords";

describe("关键词引擎", () => {
  it("按标点分段，不产生跨词噪音", () => {
    const m = bigrams("阅读，三分钟");
    expect(m.has("读三")).toBe(false);
    expect(m.has("三分")).toBe(true);
  });

  it("topK 按频次降序", () => {
    const k = topK("手机手机手机课堂课堂", 4);
    expect(k[0][0]).toBe("手机");
    expect(k[0][1]).toBe(3);
  });

  it("近义标题相似度高于无关标题", () => {
    const a = kwset("课堂该不该收手机");
    const b = kwset("教室要不要收手机");
    const c = kwset("大学专业该选热爱还是就业");
    expect(jaccard(a, b)).toBeGreaterThan(jaccard(a, c));
    expect(jaccard(a, b)).toBeGreaterThanOrEqual(0.12);
  });

  it("keywords JSON 往返一致", () => {
    const json = topicKwJson("短视频是加深还是削薄了阅读", "", "加深", "削薄");
    const set = topicSigFromKwJson(json);
    expect(set.size).toBeGreaterThan(0);
    expect(topicSigFromKwJson("坏json").size).toBe(0);
  });
});
