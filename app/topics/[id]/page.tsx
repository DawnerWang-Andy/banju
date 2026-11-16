import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { STANCE_LABEL } from "@/lib/validation";
import { topK, jaccard, topicSigFromKwJson, RELATED_THRESHOLD } from "@/lib/keywords";
import { timeAgo } from "@/lib/dates";
import { TopicDetailClient, type Brief, type PointView } from "@/components/TopicDetailClient";

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: { creator: { select: { id: true, penName: true } } },
  });
  if (!topic || topic.modStatus !== "PUBLISHED") notFound();

  const points = await prisma.debatePoint.findMany({
    where: { topicId: topic.id, status: "PUBLISHED" },
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { author: { select: { id: true, penName: true, username: true } } },
  });

  const pointIds = points.map((p) => p.id);
  const [myLikes, myStance, reviewGroups, allTopics] = await Promise.all([
    user
      ? prisma.like.findMany({
          where: { userId: user.id, targetType: "POINT", targetId: { in: pointIds } },
          select: { targetId: true },
        })
      : Promise.resolve([] as { targetId: string }[]),
    user
      ? prisma.userStance.findUnique({
          where: { userId_topicId: { userId: user.id, topicId: topic.id } },
        })
      : Promise.resolve(null),
    prisma.review.groupBy({
      by: ["targetId"],
      where: { targetType: "POINT", targetId: { in: pointIds }, status: "PUBLISHED" },
      _count: { _all: true },
    }),
    prisma.topic.findMany({
      where: { modStatus: "PUBLISHED", status: "OPEN" },
      select: { id: true, title: true, keywords: true },
      take: 300,
    }),
  ]);
  const likedSet = new Set(myLikes.map((l) => l.targetId));
  const revN = new Map(reviewGroups.map((g) => [g.targetId, g._count._all]));

  // ===== 擂台简报（自动分析，纯函数） =====
  const allText = `${topic.title}${topic.title}${topic.title}${topic.intro}${points.map((p) => p.content).join("　")}`;
  const briefAll = topK(allText, 8);
  const briefPro = topK(points.filter((p) => p.side === "PRO").map((p) => p.content).join("　"), 5);
  const briefCon = topK(points.filter((p) => p.side === "CON").map((p) => p.content).join("　"), 5);
  const brief: Brief = {
    all: briefAll,
    pro: briefPro,
    con: briefCon,
    people: new Set(points.map((p) => p.authorId)).size,
    points: points.length,
    seals: points.reduce((s, p) => s + p.likeCount, 0),
    reviews: points.reduce((s, p) => s + (revN.get(p.id) || 0), 0),
  };

  const mySig = topicSigFromKwJson(topic.keywords);
  const related = allTopics
    .filter((t) => t.id !== topic.id)
    .map((t) => ({ id: t.id, title: t.title, s: jaccard(mySig, topicSigFromKwJson(t.keywords)) }))
    .filter((x) => x.s >= RELATED_THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  const views: PointView[] = points.map((p) => ({
    id: p.id,
    side: p.side as "PRO" | "CON",
    content: p.content,
    likes: p.likeCount,
    liked: likedSet.has(p.id),
    who: p.author.penName,
    whoUsername: p.author.username,
    whoId: p.author.id,
    reviewCount: revN.get(p.id) || 0,
    time: timeAgo(p.createdAt),
  }));

  return (
    <TopicDetailClient
      topic={{
        id: topic.id,
        title: topic.title,
        intro: topic.intro,
        pro: topic.proLabel,
        con: topic.conLabel,
        status: topic.status,
        creatorName: topic.creator.penName,
        canClose: !!user && (user.id === topic.creator.id || user.role === "ADMIN"),
      }}
      points={views}
      myStance={myStance?.side || null}
      brief={brief}
      related={related}
      loggedIn={!!user}
    />
  );
}
