"use client";
// 句子卡：沉浸式一屏一句 + 双击落印 + 乐观更新（复刻原型 5.1/5.2）
import Link from "next/link";
import { useRef, useState } from "react";
import { toggleLike } from "@/actions/posts";
import type { FeedPost } from "@/lib/feed";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";
import { ReportMenu } from "./ReportMenu";

export function StampCard({
  post,
  loggedIn,
  onReview,
  onShare,
}: {
  post: FeedPost;
  loggedIn: boolean;
  onReview?: (p: FeedPost) => void;
  onShare?: (p: FeedPost) => void;
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likeCount);
  const [pop, setPop] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const lastTap = useRef(0);

  const stamp = (byDouble: boolean) => {
    if (!loggedIn) return toast(NEED_LOGIN_MSG);
    const next = byDouble ? true : !liked;
    if (byDouble && liked) return; // 双击只赏不收回
    setLiked(next);
    setLikes((n) => Math.max(n + (next ? 1 : -1), 0));
    setPop(true);
    setTimeout(() => setPop(false), 300);
    if (next) {
      const card = cardRef.current;
      if (card) {
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const b = document.createElement("div");
          b.className = "bigseal";
          b.textContent = "赏";
          card.appendChild(b);
          setTimeout(() => b.remove(), 780);
        }
        const f = document.createElement("span");
        f.className = "floatplus";
        f.textContent = "赏 +1";
        f.style.left = "calc(100% - 150px)";
        f.style.top = "calc(100% - 86px)";
        card.appendChild(f);
        setTimeout(() => f.remove(), 900);
      }
    }
    toast(next ? (byDouble ? "赏了。" : "印盖下了") : "印收回了");
    toggleLike(post.id).then((r) => {
      if (r.error === NEED_LOGIN) {
        setLiked(!next);
        setLikes(post.likeCount);
        toast(NEED_LOGIN_MSG);
      } else if (typeof r.likes === "number") setLikes(r.likes);
    });
  };

  return (
    <article
      ref={cardRef}
      className="card seen"
      onDoubleClick={() => stamp(true)}
    >
      <span className="spine">{post.typeLabel}</span>
      <div className="ctext">{post.content}</div>
      {post.reviewsPreview.length > 0 && (
        <div className="revs">
          {post.reviewsPreview.map((r, i) => (
            <div className="revline" key={i}>
              <span className="rchip">{r.stanceLabel}</span>
              <span>
                {r.who}：{r.text}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="grow" />
      <div className="foot">
        <div className="who">
          <Link href={`/u/${post.authorUsername}`}>{post.authorName}</Link>
          <small>
            {post.timeAgo}
            {onReview ? "" : " · 单句"}
          </small>
        </div>
        <div className="acts">
          <button onClick={() => stamp(false)} aria-label="盖赏">
            <span className={`stamp${liked ? " on" : ""}${pop ? " pop" : ""}`}>赏</span>
            <span>{likes}</span>
          </button>
          <button onClick={() => (onReview ? onReview(post) : toast("点卡片上的「评」来互评"))}>
            评 {post.reviewCount}
          </button>
          {onShare && <button onClick={() => onShare(post)}>画</button>}
          <ReportMenu targetType="POST" targetId={post.id} loggedIn={loggedIn} />
        </div>
      </div>
    </article>
  );
}
