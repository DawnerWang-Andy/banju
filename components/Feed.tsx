"use client";
// 首页：类型 tab + 沉浸式翻页 + 互评/分享浮层
import Link from "next/link";
import { useState } from "react";
import type { FeedPost } from "@/lib/feed";
import { StampCard } from "./StampCard";
import { ReviewSheet, type ReviewTarget } from "./ReviewSheet";
import { SharePoster } from "./SharePoster";

const TABS: [string, string][] = [
  ["ALL", "推荐"],
  ["PHILOSOPHY", "哲思"],
  ["JOKE", "段子"],
  ["MEME", "梗"],
  ["ESSAY", "随笔"],
];

export function Feed({
  init,
  tab,
  loggedIn,
}: {
  init: FeedPost[];
  tab: string;
  loggedIn: boolean;
}) {
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [share, setShare] = useState<FeedPost | null>(null);

  return (
    <div className="page-scroll feed">
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <Link key={key} href={key === "ALL" ? "/" : `/?t=${key}`} className={tab === key ? "on" : ""}>
            {label}
          </Link>
        ))}
      </div>
      {init.length === 0 ? (
        <div className="empty">
          广场还空着。<br />
          谁的第一句，会让这里开始转动？<br />
          {loggedIn && <Link href="/new" className="text-btn">写一句 →</Link>}
        </div>
      ) : (
        init.map((p) => (
          <StampCard
            key={p.id}
            post={p}
            loggedIn={loggedIn}
            onReview={(x) => setReview({ kind: "POST", id: x.id, title: x.content })}
            onShare={(x) => setShare(x)}
          />
        ))
      )}
      <Link href="/new" className="penbtn" aria-label="写一句">✍</Link>
      {review && (
        <ReviewSheet
          target={review}
          loggedIn={loggedIn}
          onClose={() => setReview(null)}
        />
      )}
      {share && <SharePoster post={{ id: share.id, content: share.content, authorName: share.authorName }} onClose={() => setShare(null)} />}
    </div>
  );
}
