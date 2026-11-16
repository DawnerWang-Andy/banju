import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/dates";
import { TOPIC_ORDER_NOTE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const user = await getCurrentUser();
  const list = await prisma.topic.findMany({
    where: { modStatus: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { creator: { select: { penName: true } } },
  });
  const ids = list.map((t) => t.id);
  const points = await prisma.debatePoint.findMany({
    where: { topicId: { in: ids }, status: "PUBLISHED" },
    select: { topicId: true, side: true, likeCount: true },
  });
  const stats = new Map<string, { pro: number; con: number; n: number }>();
  for (const p of points) {
    const s = stats.get(p.topicId) || { pro: 0, con: 0, n: 0 };
    if (p.side === "PRO") s.pro += p.likeCount;
    else s.con += p.likeCount;
    s.n += 1;
    stats.set(p.topicId, s);
  }
  // 进行中优先、闭题沉底；再按热度（两边论据总数×时间衰减）粗排
  const scored = list
    .map((t) => {
      const s = stats.get(t.id) || { pro: 0, con: 0, n: 0 };
      const ageH = (Date.now() - t.createdAt.getTime()) / 3600000;
      const heat = (s.pro + s.con + s.n) / Math.sqrt(ageH + 2);
      return { t, s, heat };
    })
    .sort((a, b) => {
      const openDiff = (a.t.status === "OPEN" ? 0 : 1) - (b.t.status === "OPEN" ? 0 : 1);
      return openDiff !== 0 ? openDiff : b.heat - a.heat;
    });

  return (
    <div className="page-scroll">
      <div className="wrap">
        <h2 style={{ marginTop: 0 }}>话题擂台</h2>
        {scored.length === 0 && <p className="muted">还没有人开擂。{user ? "第一个辩题，由你出题。" : "登录后即可发起。"}</p>}
        {scored.map(({ t, s }) => {
          const tot = Math.max(s.pro + s.con, 1);
          return (
            <Link key={t.id} href={`/topics/${t.id}`} className="topic">
              <h4>
                {t.title}
                {t.status === "CLOSED" && <span className="closed-tag">已闭题</span>}
              </h4>
              <p className="muted" style={{ marginTop: 4 }}>
                {t.intro ? t.intro + " · " : ""}
                {s.n} 条论据 · {timeAgo(t.createdAt)}
              </p>
              <div className="bar">
                <i className="pro" style={{ width: `${(s.pro / tot) * 100}%` }} />
                <i className="con" style={{ width: `${(s.con / tot) * 100}%` }} />
              </div>
              <div className="barn">
                <span>{t.proLabel} {s.pro} 赏</span>
                <span>{s.con} 赏 {t.conLabel}</span>
              </div>
            </Link>
          );
        })}
        <p className="muted" style={{ marginTop: 18 }}>{TOPIC_ORDER_NOTE}</p>
        <Link href="/topics/new" className="primary-btn" style={{ display: "inline-block", marginTop: 14, letterSpacing: ".1em" }}>
          ✎ 发起一个辩题
        </Link>
      </div>
    </div>
  );
}
