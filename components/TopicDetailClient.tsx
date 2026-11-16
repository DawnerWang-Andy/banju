"use client";
// 擂台详情：简报 + 选边 + 论据流（按赏排）+ 落座 + 互评 + 闭题 + 同类擂台
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPoint, closeTopic, setStance, togglePointLike } from "@/actions/topics";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";
import { ReviewSheet, type ReviewTarget } from "./ReviewSheet";
import { ReportMenu } from "./ReportMenu";

export type Brief = {
  all: [string, number][];
  pro: [string, number][];
  con: [string, number][];
  people: number;
  points: number;
  seals: number;
  reviews: number;
};
export type PointView = {
  id: string;
  side: "PRO" | "CON";
  content: string;
  likes: number;
  liked: boolean;
  who: string;
  whoUsername: string;
  whoId: string;
  reviewCount: number;
  time: string;
};

const kwHtml = (arr: [string, number][], empty = "—") =>
  arr.length ? (
    arr.map(([w, c]) => (
      <span key={w} className="kw" style={{ fontSize: 12 + Math.min(c, 6) * 2.5 }}>
        {w}
      </span>
    ))
  ) : (
    <span className="kw" style={{ fontSize: 12, color: "var(--meta)" }}>{empty}</span>
  );

export function TopicDetailClient(props: {
  topic: {
    id: string;
    title: string;
    intro: string;
    pro: string;
    con: string;
    status: string;
    creatorName: string;
    canClose: boolean;
  };
  points: PointView[];
  myStance: string | null;
  brief: Brief;
  related: { id: string; title: string }[];
  loggedIn: boolean;
}) {
  const { topic, brief } = props;
  const router = useRouter();
  const [stance, setStanceLocal] = useState<string | null>(props.myStance);
  const [points, setPoints] = useState(props.points);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PRO" | "CON">("ALL");

  const pick = async (side: "PRO" | "CON") => {
    if (!props.loggedIn) return toast(NEED_LOGIN_MSG);
    setStanceLocal(side);
    const r = await setStance(topic.id, side);
    if (r.error) return toast(r.error === NEED_LOGIN ? NEED_LOGIN_MSG : r.error);
    toast(side === "PRO" ? `站到了「${topic.pro}」` : `站到了「${topic.con}」`);
    router.refresh();
  };

  const fall = async () => {
    if (!props.loggedIn) return toast(NEED_LOGIN_MSG);
    if (draft.trim().length < 5) return toast("论据至少 5 个字");
    if (!stance) return toast("先选一边落座");
    setBusy(true);
    const r = await addPoint(topic.id, draft);
    setBusy(false);
    if (r.error) return toast(r.error === NEED_LOGIN ? NEED_LOGIN_MSG : r.error);
    setDraft("");
    toast("论据已落下。");
    router.refresh();
  };

  const like = async (p: PointView) => {
    if (!props.loggedIn) return toast(NEED_LOGIN_MSG);
    const next = !p.liked;
    setPoints((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, liked: next, likes: Math.max(x.likes + (next ? 1 : -1), 0) } : x))
    );
    const r = await togglePointLike(p.id);
    if (r.error) {
      setPoints((ps) =>
        ps.map((x) => (x.id === p.id ? { ...x, liked: p.liked, likes: p.likes } : x))
      );
      toast(r.error === NEED_LOGIN ? NEED_LOGIN_MSG : r.error);
    } else if (typeof r.likes === "number")
      setPoints((ps) => ps.map((x) => (x.id === p.id ? { ...x, likes: r.likes! } : x)));
  };

  const pl = points.filter((p) => p.side === "PRO").reduce((s, p) => s + p.likes, 0);
  const cl = points.filter((p) => p.side === "CON").reduce((s, p) => s + p.likes, 0);
  const tot = Math.max(pl + cl, 1);
  const shown = points
    .filter((p) => filter === "ALL" || p.side === filter)
    .slice()
    .sort((a, b) => b.likes - a.likes);
  const closed = topic.status === "CLOSED";

  return (
    <div className="page-scroll">
      <div className="wrap">
        <div className="backbar">
          <Link href="/topics">← 返回擂台</Link>
          {topic.canClose && !closed && (
            <button
              className="muted"
              style={{ marginLeft: "auto", fontSize: 12, textDecoration: "underline" }}
              onClick={async () => {
                const r = await closeTopic(topic.id);
                toast(r.ok ? "已闭题，擂台转为档案" : r.error || "失败");
                router.refresh();
              }}
            >
              闭题
            </button>
          )}
        </div>
        <h2 style={{ marginBottom: 6 }}>{topic.title}</h2>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          {topic.intro && topic.intro + " "}
          （出题人：{topic.creatorName}）
        </p>

        <div className="brief">
          <h5>擂台简报 · 自动分析</h5>
          <div className="briefkws">{kwHtml(brief.all)}</div>
          <div className="briefcols">
            <div>
              <div className="lab pro">{topic.pro}方高频</div>
              <div className="briefkws">{kwHtml(brief.pro)}</div>
            </div>
            <div>
              <div className="lab con">{topic.con}方高频</div>
              <div className="briefkws">{kwHtml(brief.con)}</div>
            </div>
          </div>
          <div className="bstat">
            {brief.people} 人参战 · {brief.points} 条论据 · {brief.seals} 次盖赏 · {brief.reviews} 条互评
          </div>
        </div>

        {closed ? (
          <p className="muted" style={{ margin: "16px 0" }}>已闭题 · 仅可浏览、盖赏与互评</p>
        ) : (
          <div className="pick">
            <button className={`pro${stance === "PRO" ? " sel" : ""}`} onClick={() => pick("PRO")}>
              {topic.pro}
            </button>
            <button className={`con${stance === "CON" ? " sel" : ""}`} onClick={() => pick("CON")}>
              {topic.con}
            </button>
          </div>
        )}

        <div className="bar">
          <i className="pro" style={{ width: `${(pl / tot) * 100}%` }} />
          <i className="con" style={{ width: `${(cl / tot) * 100}%` }} />
        </div>
        <div className="barn">
          <span>{topic.pro} {pl} 赏</span>
          <span>{cl} 赏 {topic.con}</span>
        </div>
        <div className="admin-tabs" style={{ margin: "12px 0 2px" }}>
          {(["ALL", "PRO", "CON"] as const).map((f) => (
            <button key={f} className={filter === f ? "sel" : ""} onClick={() => setFilter(f)}>
              {f === "ALL" ? "双方" : f === "PRO" ? topic.pro : topic.con}
            </button>
          ))}
        </div>

        {shown.length === 0 && <p className="muted" style={{ padding: "14px 0" }}>这一边还空着，等第一个落座的人。</p>}
        {shown.map((p) => (
          <div key={p.id} className="point">
            <span className={`side ${p.side === "PRO" ? "pro" : "con"}`}>
              {p.side === "PRO" ? topic.pro : topic.con}
            </span>
            <div className="ptext">{p.content}</div>
            <div className="foot">
              <span>
                <Link href={`/u/${p.whoUsername}`}>{p.who}</Link> · {p.time}
              </span>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button className="text-btn" style={{ fontSize: 12 }} onClick={() => setReview({ kind: "POINT", id: p.id, title: p.content })}>
                  评 {p.reviewCount}
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={() => like(p)}>
                  <span className={`stamp${p.liked ? " on" : ""}`} style={{ width: 22, height: 22, fontSize: 12 }}>
                    赏
                  </span>
                  {p.likes}
                </button>
                <ReportMenu targetType="POINT" targetId={p.id} loggedIn={props.loggedIn} />
              </span>
            </div>
          </div>
        ))}

        {!closed && (
          <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
            <input
              className="linein"
              maxLength={300}
              placeholder={stance ? "写下你的论据…" : "先选一边，再落座"}
              value={draft}
              disabled={!stance}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fall()}
              style={{ fontSize: 15 }}
            />
            <button className="text-btn" onClick={fall} disabled={busy}>
              落座
            </button>
          </div>
        )}

        {props.related.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <h5 style={{ fontFamily: "var(--serif)", color: "var(--meta)", fontSize: 12, letterSpacing: ".2em", marginBottom: 6 }}>
              同类擂台
            </h5>
            {props.related.map((r) => (
              <div key={r.id} className="simitem">
                <span>{r.title}</span>
                <Link href={`/topics/${r.id}`} className="text-btn" style={{ fontSize: 12 }}>
                  去这个擂台 →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      {review && (
        <ReviewSheet
          target={review}
          loggedIn={props.loggedIn}
          onClose={() => setReview(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}
