"use client";
// 单句页：一张卡 + 全部互评区（分享链接直达）
import Link from "next/link";
import { useState } from "react";
import { toggleLike } from "@/actions/posts";
import { report } from "@/actions/reviews";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";
import { SharePoster } from "./SharePoster";
import { ReportMenu } from "./ReportMenu";

type P = {
  id: string;
  content: string;
  typeLabel: string;
  likeCount: number;
  reviewCount: number;
  timeAgo: string;
  authorName: string;
  authorUsername: string;
  liked: boolean;
};
type R = { stanceLabel: string; who: string; text: string };

export function SinglePost({
  post,
  initialReviews,
  loggedIn,
}: {
  post: P;
  initialReviews: R[];
  loggedIn: boolean;
}) {
  const [reviews] = useState<R[]>(initialReviews);
  const [share, setShare] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likeCount);
  const [pop, setPop] = useState(false);

  const stamp = async () => {
    if (!loggedIn) return toast(NEED_LOGIN_MSG);
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(n + (next ? 1 : -1), 0));
    if (next) { setPop(true); setTimeout(() => setPop(false), 300); }
    toast(next ? "印盖下了" : "印收回了");
    const r = await toggleLike(post.id);
    if (r.error === NEED_LOGIN) { setLiked(!next); setLikes(post.likeCount); toast(NEED_LOGIN_MSG); }
    else if (typeof r.likes === "number") setLikes(r.likes);
  };

  return (
    <div className="page-scroll">
      <div style={{ padding: "10px 24px 30px", position: "relative" }}>
        <span className="spine" style={{ position: "static", float: "right", marginLeft: 10 }}>
          {post.typeLabel}
        </span>
        <div
          className="ctext seen"
          style={{ fontFamily: "var(--serif)", fontSize: "clamp(26px,7vw,34px)", lineHeight: 1.8, letterSpacing: ".05em", marginTop: 8, whiteSpace: "pre-line" }}
          onDoubleClick={stamp}
        >
          {post.content}
        </div>
        <p className="muted" style={{ marginTop: 18 }}>
          <Link href={`/u/${post.authorUsername}`} style={{ fontFamily: "var(--serif)", color: "var(--ink)", fontSize: 14 }}>
            {post.authorName}
          </Link>
          &nbsp;· {post.timeAgo}
        </p>
        <div className="acts" style={{ marginTop: 16 }}>
          <button onClick={stamp}>
            <span className={`stamp${liked ? " on" : ""}${pop ? " pop" : ""}`}>赏</span>
            <span>{likes}</span>
          </button>
          <button onClick={() => toast(`下面就是 ${reviews.length} 条互评`)}>评 {post.reviewCount}</button>
          <button onClick={() => setShare(true)}>画</button>
          <ReportMenu targetType="POST" targetId={post.id} loggedIn={loggedIn} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--hair)", padding: "18px 24px 40px" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: 15, marginBottom: 12 }}>互评席</h3>
        {reviews.length === 0 && (
          <p className="muted">还没有评语。落座的人可以回到上面句子处写一句。</p>
        )}
        {reviews.map((r, i) => (
          <div key={i} className="revline" style={{ fontSize: 13, borderBottom: "1px solid var(--hair)", padding: "9px 0" }}>
            <span className="rchip">{r.stanceLabel}</span>
            <span style={{ flex: 1 }}>
              {r.who}：{r.text}
            </span>
          </div>
        ))}
        <ReviewInline postId={post.id} title={post.content} loggedIn={loggedIn} />
      </div>

      {share && (
        <SharePoster
          post={{ id: post.id, content: post.content, authorName: post.authorName }}
          onClose={() => setShare(false)}
        />
      )}
    </div>
  );
}

// 页内直接落评（复用浮层的立场行样式）
import { useState as useS } from "react";
import { addReview } from "@/actions/reviews";
import { STANCES } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { STANCE_CN } from "./ReviewSheet";

function ReviewInline({ postId, title, loggedIn }: { postId: string; title: string; loggedIn: boolean }) {
  const [stance, setStance] = useS("RESONATE");
  const [text, setText] = useS("");
  const router = useRouter();
  const go = async () => {
    if (!loggedIn) return toast(NEED_LOGIN_MSG);
    const r = await addReview("POST", postId, stance, text);
    if (r.error === NEED_LOGIN) return toast(NEED_LOGIN_MSG);
    if (r.error) return toast(r.error);
    setText("");
    toast("评已落下。");
    router.refresh();
  };
  return (
    <div style={{ marginTop: 16 }}>
      <div className="stances">
        {STANCES.map((s) => (
          <button key={s} className={stance === s ? "sel" : ""} onClick={() => setStance(s)}>
            {STANCE_CN[s]}
          </button>
        ))}
      </div>
      <div className="revform">
        <input
          className="linein"
          style={{ fontSize: 14 }}
          maxLength={60}
          placeholder={`评一句「${title.slice(0, 10)}…」`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <button className="text-btn" onClick={go}>落评</button>
      </div>
    </div>
  );
}
