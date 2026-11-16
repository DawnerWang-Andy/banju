// GET /api/convs → 我的会话列表摘要（轮询用）
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: "NEED_LOGIN" }, { status: 401 });
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ userA: u.id }, { userB: u.id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      a: { select: { id: true, penName: true } },
      b: { select: { id: true, penName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, senderId: true } },
    },
  });
  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: convos.map((c) => c.id) },
      senderId: { not: u.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((x) => [x.conversationId, x._count._all]));
  return NextResponse.json({
    convos: convos.map((c) => {
      const other = c.a.id === u.id ? c.b : c.a;
      const last = c.messages[0];
      return {
        id: c.id,
        otherId: other.id,
        name: other.penName,
        last: last ? (last.senderId === u.id ? "我：" + last.content : last.content) : "",
        unread: unreadMap.get(c.id) || 0,
        at: c.lastMessageAt.getTime(),
      };
    }),
  });
}
