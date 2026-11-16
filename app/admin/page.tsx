import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TYPE_LABEL } from "@/lib/validation";
import { timeAgo } from "@/lib/dates";
import { AdminClient, type AdminData } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

async function targetText(targetType: string, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  if (targetType === "POST") {
    const rows = await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true, content: true } });
    return new Map(rows.map((r) => [r.id, r.content]));
  }
  if (targetType === "POINT") {
    const rows = await prisma.debatePoint.findMany({ where: { id: { in: ids } }, select: { id: true, content: true } });
    return new Map(rows.map((r) => [r.id, r.content]));
  }
  if (targetType === "REVIEW") {
    const rows = await prisma.review.findMany({ where: { id: { in: ids } }, select: { id: true, content: true } });
    return new Map(rows.map((r) => [r.id, r.content]));
  }
  // DM：隐私红线——只把被举报那条会话的消息给管理员看
  const msgs = await prisma.message.findMany({
    where: { conversationId: { in: ids } },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { penName: true } } },
  });
  const byConvo = new Map<string, string>();
  for (const m of msgs)
    byConvo.set(m.conversationId, (byConvo.get(m.conversationId) || "") + `${m.sender.penName}：${m.content}\n`);
  return byConvo;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN")
    return (
      <div className="page-scroll">
        <div className="wrap">
          <p className="muted">这里不是你的位置。</p>
        </div>
      </div>
    );

  const [reports, pendingPosts, pendingPoints, words, users, allTopics, allPoints, stats] = await Promise.all([
    prisma.report.findMany({
      where: { handled: false },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { reporter: { select: { penName: true } } },
    }),
    prisma.post.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 60,
      include: { author: { select: { penName: true } } },
    }),
    prisma.debatePoint.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 60,
      include: { author: { select: { penName: true } }, topic: { select: { title: true } } },
    }),
    prisma.sensitiveWord.findMany({ orderBy: { createdAt: "desc" }, take: 400 }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, username: true, penName: true, role: true, banned: true, createdAt: true } }),
    prisma.topic.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { creator: { select: { penName: true } } },
    }),
    prisma.debatePoint.groupBy({ by: ["topicId"], _count: { _all: true } }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
      prisma.topic.count(),
    ]),
  ]);

  const textMaps = await Promise.all(
    (["POST", "POINT", "REVIEW", "DM"] as const).map(async (tt) => {
      const ids = reports.filter((r) => r.targetType === tt).map((r) => r.targetId);
      return [tt, await targetText(tt, [...new Set(ids)])] as const;
    })
  );
  const txt = Object.fromEntries(textMaps) as Record<string, Map<string, string>>;

  const data: AdminData = {
    stats: { users: stats[0], posts: stats[1], reviews: stats[2], topics: stats[3] },
    reports: reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      reason: r.reason,
      detail: r.detail,
      reporter: r.reporter.penName,
      time: timeAgo(r.createdAt),
      text: (txt[r.targetType]?.get(r.targetId) || "（目标已删除）").slice(0, 160),
    })),
    pendingPosts: pendingPosts.map((p) => ({ id: p.id, text: p.content, who: p.author.penName, type: TYPE_LABEL[p.type] || "句", time: timeAgo(p.createdAt) })),
    pendingPoints: pendingPoints.map((p) => ({ id: p.id, text: p.content, who: p.author.penName, topic: p.topic.title, time: timeAgo(p.createdAt) })),
    words: words.map((w) => ({ id: w.id, word: w.word, level: w.level })),
    users: users.map((u) => ({ id: u.id, username: u.username, penName: u.penName, role: u.role, banned: u.banned, time: timeAgo(u.createdAt) })),
    topics: allTopics.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      points: allPoints.find((g) => g.topicId === t.id)?._count._all || 0,
      creator: t.creator.penName,
    })),
  };

  return (
    <div className="page-scroll">
      <div className="wrap">
        <AdminClient data={data} />
      </div>
    </div>
  );
}
