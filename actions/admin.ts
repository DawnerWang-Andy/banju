"use server";
// 管理后台：待审 / 举报处置 / 敏感词 / 用户封禁
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { invalidateWordCache } from "@/lib/sensitive";
import { limited } from "@/lib/rate";

export type Result = { error?: string; ok?: boolean };

async function guardWord(userRate: string) {
  await requireAdmin();
  if (limited(userRate, 120, 3600 * 1000)) throw new Error("操作太频繁");
}

/** 待审帖子/论据：通过或驳回（驳回=REMOVED） */
export async function moderatePending(
  kind: "POST" | "POINT",
  id: string,
  approve: boolean
): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "FORBIDDEN" };
  }
  const status = approve ? "PUBLISHED" : "REMOVED";
  if (kind === "POST") await prisma.post.update({ where: { id }, data: { status } });
  else await prisma.debatePoint.update({ where: { id }, data: { status } });
  revalidatePath("/");
  revalidatePath("/topics");
  revalidatePath("/admin");
  return { ok: true };
}

/** 举报处置：REMOVE 下架目标 / IGNORE 忽略（一律标记 handled） */
export async function handleReport(id: string, verdict: "REMOVE" | "IGNORE"): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "FORBIDDEN" };
  }
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) return { error: "举报不存在" };
  if (verdict === "REMOVE") {
    if (r.targetType === "POST")
      await prisma.post.update({ where: { id: r.targetId }, data: { status: "REMOVED" } }).catch(() => {});
    if (r.targetType === "POINT")
      await prisma.debatePoint
        .update({ where: { id: r.targetId }, data: { status: "REMOVED" } })
        .catch(() => {});
    if (r.targetType === "REVIEW")
      await prisma.review.update({ where: { id: r.targetId }, data: { status: "REMOVED" } }).catch(() => {});
    // DM 不"下架"，只标记处理；会话内容对双方保留
  }
  await prisma.report.update({ where: { id }, data: { handled: true } });
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setBanned(userId: string, banned: boolean): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "FORBIDDEN" };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "用户不存在" };
  if (target.role === "ADMIN") return { error: "不能封禁管理员" };
  await prisma.user.update({ where: { id: userId }, data: { banned } });
  if (banned) await prisma.session.deleteMany({ where: { userId } });
  revalidatePath(`/u/${target.username}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function addWord(wordRaw: string, level: "BLOCK" | "FILTER"): Promise<Result> {
  let adminId;
  try {
    const a = await requireAdmin();
    adminId = a.id;
  } catch {
    return { error: "FORBIDDEN" };
  }
  const word = String(wordRaw || "").trim();
  if (!word || word.length > 20) return { error: "词条 1-20 字" };
  if (level !== "BLOCK" && level !== "FILTER") return { error: "级别不对" };
  await prisma.sensitiveWord
    .create({ data: { word, level, addedBy: adminId } })
    .catch(() => {}); // 已存在则静默
  invalidateWordCache();
  revalidatePath("/admin");
  return { ok: true };
}

export async function removeWord(id: string): Promise<Result> {
  try {
    await guardWord("word");
  } catch (e) {
    return { error: String((e as Error).message || "FORBIDDEN") };
  }
  await prisma.sensitiveWord.delete({ where: { id } }).catch(() => {});
  invalidateWordCache();
  revalidatePath("/admin");
  return { ok: true };
}
