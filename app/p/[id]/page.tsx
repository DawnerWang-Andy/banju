import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { timeAgo } from "@/lib/dates";
import { TYPE_LABEL, STANCE_LABEL } from "@/lib/validation";
import { SinglePost } from "@/components/SinglePost";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { author: { select: { username: true, penName: true } } },
  });
  if (!post || post.status !== "PUBLISHED") notFound();

  const [liked, reviews] = await Promise.all([
    user
      ? prisma.like.findUnique({
          where: {
            userId_targetType_targetId: { userId: user.id, targetType: "POST", targetId: post.id },
          },
        })
      : Promise.resolve(null),
    prisma.review.findMany({
      where: { targetType: "POST", targetId: post.id, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      take: 60,
      select: { stance: true, content: true, user: { select: { penName: true } } },
    }),
  ]);

  return (
    <SinglePost
      post={{
        id: post.id,
        content: post.content,
        typeLabel: TYPE_LABEL[post.type] || "句",
        likeCount: post.likeCount,
        reviewCount: post.reviewCount,
        timeAgo: timeAgo(post.createdAt),
        authorName: post.author.penName,
        authorUsername: post.author.username,
        liked: !!liked,
      }}
      initialReviews={reviews.map((r) => ({
        stanceLabel: STANCE_LABEL[r.stance] || r.stance,
        who: r.user.penName,
        text: r.content,
      }))}
      loggedIn={!!user}
    />
  );
}
