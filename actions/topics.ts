"use server";
// 话题擂台：发起 / 选边 / 论据 / 赏 / 闭题
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, UNAUTHORIZED } from "@/lib/session";
import { validTopicForm, validPoint } from "@/lib/validation";
import { sanitizeControl, screen } from "@/lib/sensitive";
import { topicKwJson } from "@/lib/keywords";
import { limited } from "@/lib/rate";

export type Result = { error?: string; ok?: boolean; id?: string };

export async function createTopic(input: {
  title: string;
  intro: string;
  pro: string;
  con: string;
}): Promise<Result> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (limited(`topic:${uid}`, 3, 24 * 3600 * 1000)) return { error: "每天最多开 3 个擂" };
  const title = sanitizeControl(input.title || "").trim();
  const intro = sanitizeControl(input.intro || "").trim().slice(0, 100);
  const pro = (input.pro || "").trim() || "正方";
  const con = (input.con || "").trim() || "反方";
  const err = validTopicForm(title, pro, con);
  if (err) return { error: err };
  const scr = await screen(`${title}　${intro}`);
  if (scr.hit === "block") return { error: "辩题含违禁内容，换个工作再开擂" };
  const t = await prisma.topic.create({
    data: {
      creatorId: uid,
      title,
      intro,
      proLabel: pro.slice(0, 10),
      conLabel: con.slice(0, 10),
      keywords: topicKwJson(title, intro, pro, con),
    },
  });
  revalidatePath("/topics");
  return { ok: true, id: t.id };
}

export async function setStance(topicId: string, side: string): Promise<Result> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (side !== "PRO" && side !== "CON") return { error: "参数不对" };
  await prisma.userStance.upsert({
    where: { userId_topicId: { userId: uid, topicId } },
    create: { userId: uid, topicId, side },
    update: { side },
  });
  revalidatePath(`/topics/${topicId}`);
  return { ok: true };
}

export async function addPoint(topicId: string, contentRaw: string): Promise<Result> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.status !== "OPEN") return { error: "擂台已闭，只读" };
  const stance = await prisma.userStance.findUnique({
    where: { userId_topicId: { userId: uid, topicId } },
  });
  if (!stance) return { error: "先选一边落座" };
  const content = sanitizeControl(String(contentRaw || ""));
  const err = validPoint(content);
  if (err) return { error: err };
  // 每人每边最多 5 条
  const mine = await prisma.debatePoint.count({
    where: { topicId, authorId: uid, side: stance.side, status: { not: "REMOVED" } },
  });
  if (mine >= 5) return { error: "这一边你已落座 5 条论据，先听听对方" };
  const scr = await screen(content);
  const pt = await prisma.debatePoint.create({
    data: {
      topicId,
      authorId: uid,
      side: stance.side,
      content: scr.text,
      status: scr.hit === "block" ? "PENDING" : "PUBLISHED",
    },
  });
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/topics");
  return { ok: true, id: pt.id };
}

export async function togglePointLike(pointId: string): Promise<Result & { likes?: number }> {
  let uid;
  try {
    uid = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  const pt = await prisma.debatePoint.findUnique({ where: { id: pointId } });
  if (!pt || pt.status !== "PUBLISHED") return { error: "论据不可赏" };
  const existing = await prisma.like.findUnique({
    where: { userId_targetType_targetId: { userId: uid, targetType: "POINT", targetId: pointId } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.debatePoint.update({ where: { id: pointId }, data: { likeCount: { decrement: 1 } } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: uid, targetType: "POINT", targetId: pointId } }),
      prisma.debatePoint.update({ where: { id: pointId }, data: { likeCount: { increment: 1 } } }),
    ]);
  }
  const fresh = await prisma.debatePoint.findUnique({
    where: { id: pointId },
    select: { likeCount: true, topicId: true },
  });
  revalidatePath(`/topics/${fresh?.topicId}`);
  return { ok: true, likes: Math.max(fresh?.likeCount ?? 0, 0) };
}

export async function closeTopic(topicId: string): Promise<Result> {
  const u = await requireUser();
  const t = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!t) return { error: "话题不存在" };
  if (t.creatorId !== u.id && u.role !== "ADMIN") return { error: "只有发起者或管理员能闭题" };
  await prisma.topic.update({ where: { id: topicId }, data: { status: "CLOSED" } });
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/topics");
  return { ok: true };
}
