import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { InboxClient, type ConvoSummary } from "@/components/InboxClient";
import { DM_PRIVACY_NOTE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: { c?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ userA: user.id }, { userB: user.id }] },
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
      senderId: { not: user.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((x) => [x.conversationId, x._count._all]));
  const summaries: ConvoSummary[] = convos.map((c) => {
    const other = c.a.id === user.id ? c.b : c.a;
    const last = c.messages[0];
    return {
      id: c.id,
      otherId: other.id,
      name: other.penName,
      last: last ? (last.senderId === user.id ? "我：" + last.content : last.content) : "",
      unread: unreadMap.get(c.id) || 0,
    };
  });

  let active: { id: string; name: string; otherId: string } | null = null;
  if (searchParams.c) {
    const c = convos.find((x) => x.id === searchParams.c);
    if (c) {
      const other = c.a.id === user.id ? c.b : c.a;
      active = { id: c.id, name: other.penName, otherId: other.id };
      // 打开会话即标已读
      await prisma.message.updateMany({
        where: { conversationId: c.id, senderId: { not: user.id }, readAt: null },
        data: { readAt: new Date() },
      });
    }
  }

  return (
    <div className="page-scroll">
      <InboxClient userId={user.id} initialConvos={summaries} active={active} note={DM_PRIVACY_NOTE} />
    </div>
  );
}
