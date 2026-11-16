import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TYPE_LABEL } from "@/lib/validation";
import { DmButton } from "@/components/DmButton";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: { username: string } }) {
  const me = await getCurrentUser();
  const u = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, username: true, penName: true, banned: true, createdAt: true },
  });
  if (!u) notFound();

  if (u.banned)
    return (
      <div className="page-scroll">
        <div className="wrap">
          <div className="me-head">
            <div className="name">{u.penName}</div>
            <div className="muted" style={{ marginTop: 8 }}>这个账号已停摆。</div>
          </div>
        </div>
      </div>
    );

  const [posts, gotSeals, reviewCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: u.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: { id: true, content: true, type: true, likeCount: true, reviewCount: true },
    }),
    prisma.post.aggregate({ where: { authorId: u.id, status: "PUBLISHED" }, _sum: { likeCount: true } }),
    prisma.review.count({ where: { userId: u.id, status: "PUBLISHED" } }),
  ]);

  return (
    <div className="page-scroll">
      <div className="wrap">
        <div className="me-head">
          <div className="name">{u.penName}</div>
          <div className="muted" style={{ marginTop: 8 }}>
            {u.createdAt.getFullYear()} 年 {u.createdAt.getMonth() + 1} 月落座半句
            {reviewCount > 0 ? ` · 也是 ${reviewCount} 次评审` : ""}
          </div>
          <div className="mini">
            <div><b>{posts.length}</b>句</div>
            <div><b>{gotSeals._sum.likeCount || 0}</b>赏</div>
            <div><b>{reviewCount}</b>评</div>
          </div>
          {me && me.id !== u.id && <DmButton targetUserId={u.id} />}
        </div>
        <h2 style={{ marginTop: 22 }}>TA 写下的</h2>
        {posts.length === 0 ? (
          <p className="muted">还没有公开的句子。</p>
        ) : (
          <div className="grid">
            {posts.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`}>
                <div className="cell">
                  {p.content}
                  <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                    {TYPE_LABEL[p.type]} · {p.likeCount} 赏 · {p.reviewCount} 评
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
