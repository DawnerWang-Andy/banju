"use server";
// 互评 / 举报
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, UNAUTHORIZED } from "@/lib/session";
import { validReview, REPORT_REASONS } from "@/lib/validation";
import { sanitizeControl, screen } from "@/lib/sensitive";
import { limited } from "@/lib/rate";

export type ReviewResult = { error?: string; ok?: boolean };

export async function addReview(
  targetType: string,
  targetId: string,
  stance: string,
  contentRaw: string
): Promise<ReviewResult> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (targetType !== "POST" && targetType !== "POINT") return { error: "参数不对" };
  if (limited(`rev:${uid}`, 30, 3600 * 1000)) return { error: "评太快了，歇一会儿" };
  const content = sanitizeControl(String(contentRaw || ""));
  const err = validReview(content, stance);
  if (err) return { error: err };

  // 目标必须存在且可评
  const target =
    targetType === "POST"
      ? await prisma.post.findUnique({ where: { id: targetId }, select: { id: true, status: true } })
      : await prisma.debatePoint.findUnique({
          where: { id: targetId },
          select: { id: true, status: true },
        });
  if (!target || target.status !== "PUBLISHED") return { error: "这条内容不可评" };

  const scr = await screen(content);
  if (scr.hit === "block") return { error: "评语含违禁内容，换个说法" };
  await prisma.review.create({
    data: { userId: uid, targetType, targetId, stance, content: scr.text },
  });
  if (targetType === "POST") {
    await prisma.post.update({ where: { id: targetId }, data: { reviewCount: { increment: 1 } } });
    revalidatePath(`/p/${targetId}`);
  } else {
    const pt = await prisma.debatePoint.findUnique({ where: { id: targetId }, select: { topicId: true } });
    if (pt) revalidatePath(`/topics/${pt.topicId}`);
  }
  revalidatePath("/");
  revalidatePath("/me");
  return { ok: true };
}

export type ReportResult = { error?: string; ok?: boolean };

export async function report(
  targetType: string,
  targetId: string,
  reason: string,
  detailRaw?: string
): Promise<ReportResult> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (!["POST", "REVIEW", "POINT", "DM"].includes(targetType)) return { error: "参数不对" };
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { error: "选一个举报理由" };
  if (limited(`rep:${uid}`, 5, 3600 * 1000)) return { error: "举报太频繁" };
  const detail = detailRaw ? sanitizeControl(String(detailRaw)).slice(0, 200) : null;
  await prisma.report.create({ data: { targetType, targetId, reporterId: uid, reason, detail } });
  if (targetType === "POST")
    await prisma.post.update({ where: { id: targetId }, data: { reportCount: { increment: 1 } } });
  return { ok: true };
}
