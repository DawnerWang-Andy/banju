import { describe, expect, it } from "vitest";
import { validPost, validReview, validRegister, validTopicForm, validPoint } from "@/lib/validation";

describe("校验", () => {
  it("句子：5-300，随笔 5-500", () => {
    expect(validPost("短", "PHILOSOPHY")).toBeTruthy();
    expect(validPost("字".repeat(301), "JOKE")).toBeTruthy();
    expect(validPost("字".repeat(400), "ESSAY")).toBeNull();
    expect(validPost("合法的一句", "NOTYPE")).toBeTruthy();
  });

  it("互评：立场必须在五选，评语 2-60", () => {
    expect(validReview("共鸣一下", "RESONATE")).toBeNull();
    expect(validReview("单", "ADMIRE")).toBeTruthy();
    expect(validReview("好好好", "瞎评")).toBeTruthy();
    expect(validReview("字".repeat(61), "DOUBT")).toBeTruthy();
  });

  it("注册：用户名格式 + 笔名长度 + 密码强度", () => {
    expect(validRegister("banju_01", "半句", "123456")).toBeNull();
    expect(validRegister("坏 名", "半句", "123456")).toBeTruthy();
    expect(validRegister("ok", "半句", "123")).toBeTruthy();
    expect(validRegister("ok", "字".repeat(21), "123456")).toBeTruthy();
  });

  it("辩题与论据边界", () => {
    expect(validTopicForm("这是个足够长的辩题", "正方", "反方")).toBeNull();
    expect(validTopicForm("短", "正方", "反方")).toBeTruthy();
    expect(validPoint("字".repeat(301))).toBeTruthy();
    expect(validPoint("一条五字论据")).toBeNull();
  });
});
