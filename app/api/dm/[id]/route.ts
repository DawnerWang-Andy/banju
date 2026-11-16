// GET /api/dm/[id] → 会话消息；同时把对方消息标为已读（仅参与者）
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: "NEED_LOGIN" }, { status: 401 });
  const convo = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!convo || (convo.userA !== u.id && convo.userB !== u.id))
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.message.updateMany({
    where: { conversationId: convo.id, senderId: { not: u.id }, readAt: null },
    data: { readAt: new Date() },
  });
  const msgs = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, content: true, createdAt: true },
  });
  return NextResponse.json({
    messages: msgs.map((m) => ({
      id: m.id,
      mine: m.senderId === u.id,
      text: m.content,
      time: new Date(m.createdAt).toLocaleString("zh-CN", { hour12: false }),
    })),
  });
}
