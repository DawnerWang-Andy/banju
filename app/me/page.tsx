import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TYPE_LABEL, STANCE_LABEL } from "@/lib/validation";
import { timeAgo } from "@/lib/dates";
import { MeClient } from "@/components/MeClient";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [mine, likedLikes, givenReviews, blocks, convoCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id, status: { not: "REMOVED" } },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: { id: true, content: true, type: true, likeCount: true, reviewCount: true, status: true },
    }),
    prisma.like.findMany({
      where: { userId: user.id, targetType: "POST" },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: { targetId: true },
    }),
    prisma.review.findMany({
      where: { userId: user.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: { stance: true, content: true, createdAt: true },
    }),
    prisma.block.findMany({
      where: { blockerId: user.id },
      include: { blocked: { select: { id: true, penName: true, username: true } } },
    }),
    prisma.conversation.count({ where: { OR: [{ userA: user.id }, { userB: user.id }] } }),
  ]);

  const likedPosts =
    likedLikes.length === 0
      ? []
      : await prisma.post.findMany({
          where: { id: { in: likedLikes.map((l) => l.targetId) }, status: "PUBLISHED" },
          select: { id: true, content: true, type: true, author: { select: { penName: true } } },
        });

  const gotSeals = mine.reduce((s, p) => s + p.likeCount, 0);
  const gotRevs = mine.reduce((s, p) => s + p.reviewCount, 0);

  return (
    <MeClient
      user={{ username: user.username, penName: user.penName, role: user.role }}
      stats={{ posts: mine.length, seals: gotSeals, reviewsGiven: givenReviews.length, reviewsGot: gotRevs, convos: convoCount }}
      mine={mine.map((p) => ({
        id: p.id,
        content: p.content,
        typeLabel: TYPE_LABEL[p.type] || "句",
        likes: p.likeCount,
        reviews: p.reviewCount,
        status: p.status,
      }))}
      liked={likedPosts.map((p) => ({
        id: p.id,
        content: p.content,
        author: p.author.penName,
      }))}
      given={givenReviews.map((r) => ({
        stanceLabel: STANCE_LABEL[r.stance] || r.stance,
        text: r.content,
        time: timeAgo(r.createdAt),
      }))}
      blocks={blocks.map((b) => ({ id: b.blocked.id, penName: b.blocked.penName, username: b.blocked.username }))}
    />
  );
}
