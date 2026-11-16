// 推荐流装配（服务端）：热度排序 + 冷启动加权批量查 + 类型过滤
import { prisma } from "./prisma";
import { rankByHot, topThenShuffle } from "./rank";
import { timeAgo } from "./dates";
import { TYPE_LABEL, STANCE_LABEL } from "./validation";

const postSelect = {
  id: true,
  authorId: true,
  content: true,
  type: true,
  likeCount: true,
  reviewCount: true,
  createdAt: true,
  author: { select: { username: true, penName: true } },
} as const;

export type FeedPost = {
  id: string;
  content: string;
  typeLabel: string;
  type: string;
  likeCount: number;
  reviewCount: number;
  timeAgo: string;
  authorName: string;
  authorUsername: string;
  createdAt: number;
  liked: boolean;
  reviewsPreview: { stanceLabel: string; who: string; text: string }[];
};

type Row = {
  id: string;
  authorId: string;
  content: string;
  type: string;
  likeCount: number;
  reviewCount: number;
  createdAt: Date;
  author: { username: string; penName: string };
  authorReviews?: number;
};

export async function getHotFeed(
  userId: string | null,
  type?: string,
  limit = 60
): Promise<FeedPost[]> {
  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (type && type !== "ALL") where.type = type;

  const rows = (await prisma.post.findMany({
    where,
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: 200,
    select: postSelect,
  })) as unknown as Row[];

  // 作者互评数（×1.2 冷启动加权的数据来源），一次 groupBy 批量拿
  const rc = await prisma.review.groupBy({
    by: ["userId"],
    where: { userId: { in: [...new Set(rows.map((r) => r.authorId))] }, status: "PUBLISHED" },
    _count: { _all: true },
  });
  const warm = new Map(rc.map((x) => [x.userId, x._count._all]));
  for (const r of rows) r.authorReviews = warm.get(r.authorId) || 0;

  const ranked = (topThenShuffle(
    rankByHot(rows as unknown as (Row & { createdAtRank?: number })[])
  ) as Row[]).slice(0, limit);
  const ids = ranked.map((r) => r.id);

  const [likes, revs] = await Promise.all([
    userId
      ? prisma.like.findMany({
          where: { userId, targetType: "POST", targetId: { in: ids } },
          select: { targetId: true },
        })
      : Promise.resolve([] as { targetId: string }[]),
    prisma.review.findMany({
      where: { targetType: "POST", targetId: { in: ids }, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { targetId: true, stance: true, content: true, user: { select: { penName: true } } },
    }),
  ]);
  const likedSet = new Set(likes.map((l) => l.targetId));

  const byPost = new Map<string, FeedPost["reviewsPreview"]>();
  for (const rv of revs) {
    const arr = byPost.get(rv.targetId) || [];
    if (arr.length < 2)
      arr.push({
        stanceLabel: STANCE_LABEL[rv.stance] || rv.stance,
        who: rv.user.penName,
        text: rv.content,
      });
    byPost.set(rv.targetId, arr);
  }

  return ranked.map((x) => ({
    id: x.id,
    content: x.content,
    type: x.type,
    typeLabel: TYPE_LABEL[x.type] || "句",
    likeCount: x.likeCount,
    reviewCount: x.reviewCount,
    timeAgo: timeAgo(x.createdAt),
    authorName: x.author.penName,
    authorUsername: x.author.username,
    createdAt: x.createdAt.getTime(),
    liked: likedSet.has(x.id),
    reviewsPreview: (byPost.get(x.id) || []).slice().reverse(),
  }));
}

export async function getUnreadCount(userId: string) {
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ userA: userId }, { userB: userId }] },
    select: { id: true },
  });
  return prisma.message.count({
    where: {
      conversationId: { in: convos.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
  });
}
