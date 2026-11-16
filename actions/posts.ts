"use server";
// 发布句子 / 盖赏（点赞）
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser, UNAUTHORIZED } from "@/lib/session";
import { validPost } from "@/lib/validation";
import { sanitizeControl, screen } from "@/lib/sensitive";
import { limited } from "@/lib/rate";

export type PublishResult = {
  error?: string;
  ok?: boolean;
  id?: string;
  pending?: boolean;
  nudged?: boolean;
};

export async function publish(contentRaw: string, type: string): Promise<PublishResult> {
  let u;
  try {
    u = await requireUser();
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (limited(`pub:${u.id}`, 10, 3600 * 1000)) return { error: "发布太频繁，一小时后再试" };
  const content = sanitizeControl(String(contentRaw || ""));
  const err = validPost(content, type);
  if (err) return { error: err };

  const scr = await screen(content);
  const status = scr.hit === "block" ? "PENDING" : "PUBLISHED";
  const p = await prisma.post.create({
    data: { authorId: u.id, content: scr.text, type, status },
  });
  revalidatePath("/");
  revalidatePath(`/u/${u.username}`);
  revalidatePath("/me");

  // 先评后创引导：统计该用户给出的互评数
  const given = await prisma.review.count({ where: { userId: u.id, status: "PUBLISHED" } });
  return { ok: true, id: p.id, pending: status === "PENDING", nudged: given < 2 };
}

export type LikeResult = { error?: string; liked?: boolean; likes?: number };

export async function toggleLike(postId: string): Promise<LikeResult> {
  let u;
  try {
    u = await requireUser();
  } catch {
    return { error: UNAUTHORIZED };
  }
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.status !== "PUBLISHED") return { error: "句子不存在或已下架" };

  const existing = await prisma.like.findUnique({
    where: { userId_targetType_targetId: { userId: u.id, targetType: "POST", targetId: postId } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: u.id, targetType: "POST", targetId: postId } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
  }
  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
  revalidatePath(`/p/${postId}`);
  return { liked: !existing, likes: Math.max(fresh?.likeCount ?? 0, 0) };
}
