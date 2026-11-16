"use server";
// 私信：开会话 / 发送 / 拉黑
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, UNAUTHORIZED } from "@/lib/session";
import { validMessage } from "@/lib/validation";
import { sanitizeControl, screen } from "@/lib/sensitive";
import { limited } from "@/lib/rate";
import type { SessionUser } from "@/lib/session";

export type DmResult = { error?: string; ok?: boolean; convoId?: string; blocked?: boolean };

const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

async function blockedEither(userId: string, otherId: string): Promise<boolean> {
  const n = await prisma.block.count({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
  });
  return n > 0;
}

/** 返回我与 target 的会话 id；被拉黑则拒绝开新会话 */
export async function startConversation(targetUserId: string): Promise<DmResult> {
  let u: SessionUser;
  try {
    u = await requireUser();
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (targetUserId === u!.id) return { error: "不能私信自己" };
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.banned) return { error: "对方已停摆" };
  if (await blockedEither(u!.id, targetUserId))
    return { error: "对方已设置访问限制" };
  if (limited(`convo:${u!.id}`, 5, 24 * 3600 * 1000)) return { error: "今天新开的会话太多了" };
  const [a, b] = pair(u!.id, targetUserId);
  const convo = await prisma.conversation.upsert({
    where: { userA_userB: { userA: a, userB: b } },
    create: { userA: a, userB: b },
    update: {},
  });
  return { ok: true, convoId: convo.id };
}

export async function sendMessage(convoId: string, contentRaw: string): Promise<DmResult> {
  let u;
  try {
    u = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  const convo = await prisma.conversation.findUnique({ where: { id: convoId } });
  if (!convo || (convo.userA !== u && convo.userB !== u)) return { error: "FORBIDDEN" };
  const other = convo.userA === u ? convo.userB : convo.userA;
  if (await blockedEither(u, other)) return { error: "对方已设置访问限制" };
  if (limited(`dm:${u}`, 60, 3600 * 1000)) return { error: "一小时最多 60 条" };
  const content = sanitizeControl(String(contentRaw || ""));
  const err = validMessage(content);
  if (err) return { error: err };
  const scr = await screen(content);
  if (scr.hit === "block") return { error: "这条消息含违禁内容，发不出去" };
  await prisma.message.create({
    data: { conversationId: convoId, senderId: u, content: scr.text },
  });
  await prisma.conversation.update({
    where: { id: convoId },
    data: { lastMessageAt: new Date() },
  });
  revalidatePath("/inbox");
  return { ok: true };
}

export async function toggleBlock(targetUserId: string): Promise<DmResult> {
  let u;
  try {
    u = (await requireUser()).id;
  } catch {
    return { error: UNAUTHORIZED };
  }
  if (targetUserId === u) return { error: "不能拉黑自己" };
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: u, blockedId: targetUserId } },
  });
  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    revalidatePath("/me");
    return { ok: true, blocked: false };
  }
  await prisma.block.create({ data: { blockerId: u, blockedId: targetUserId } });
  revalidatePath("/me");
  return { ok: true, blocked: true };
}
