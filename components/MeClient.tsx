"use client";
// 我：三 tab + 改笔名 + 夜读开关 + 黑名单 + 退出
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { editProfile, logout } from "@/actions/auth";
import { toggleBlock } from "@/actions/dms";
import { toast } from "@/lib/ui";

const TABS = ["我的句子", "我赏过的", "我评过的"] as const;

export function MeClient(props: {
  user: { username: string; penName: string; role: string };
  stats: { posts: number; seals: number; reviewsGiven: number; reviewsGot: number; convos: number };
  mine: { id: string; content: string; typeLabel: string; likes: number; reviews: number; status: string }[];
  liked: { id: string; content: string; author: string }[];
  given: { stanceLabel: string; text: string; time: string }[];
  blocks: { id: string; penName: string; username: string }[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
  );
  const [pen, setPen] = useState(props.user.penName);
  const router = useRouter();

  const switchTheme = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("banju-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
    toast(next ? "夜读模式" : "白天，纸的颜色");
  };

  return (
    <div className="page-scroll">
      <div className="wrap">
        <div className="me-head">
          <div className="name">{props.user.penName}</div>
          <div className="muted" style={{ marginTop: 8 }}>
            @{props.user.username}
            {props.user.role === "ADMIN" ? " · 管理员" : ""} · 每个人都是作者，也是评审
          </div>
          <div className="mini">
            <div><b>{props.stats.posts}</b>句</div>
            <div><b>{props.stats.seals}</b>赏</div>
            <div><b>{props.stats.reviewsGot}</b>收到评</div>
            <div><b>{props.stats.reviewsGiven}</b>回评</div>
          </div>
          {props.stats.reviewsGiven < 2 && (
            <div className="hintcard">
              评审信用还差 {2 - props.stats.reviewsGiven} 条：去广场回评，攒满 2
              条后你的新句子将获得冷启动加权（×1.2）。
            </div>
          )}
        </div>

        <div className="admin-tabs" style={{ marginTop: 18 }}>
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "sel" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "我的句子" &&
          (props.mine.length === 0 ? (
            <p className="muted">还没写过。空着的地方，正等你来填。</p>
          ) : (
            <div className="grid">
              {props.mine.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`}>
                  <div className="cell">
                    {p.content}
                    <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                      {p.typeLabel} · {p.likes} 赏 · {p.reviews} 评
                      {p.status === "PENDING" ? " · 审核中" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}

        {tab === "我赏过的" &&
          (props.liked.length === 0 ? (
            <p className="muted">还没有赏过任何句子。看到喜欢的，替它盖一方印。</p>
          ) : (
            <div className="grid">
              {props.liked.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`}>
                  <div className="cell">
                    {p.content}
                    <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>{p.author}</div>
                  </div>
                </Link>
              ))}
            </div>
          ))}

        {tab === "我评过的" &&
          (props.given.length === 0 ? (
            <p className="muted">还没有写过评语。互评让每一句都被认真读过。</p>
          ) : (
            props.given.map((r, i) => (
              <div key={i} className="revline" style={{ borderBottom: "1px solid var(--hair)", padding: "10px 0", fontSize: 13 }}>
                <span className="rchip">{r.stanceLabel}</span>
                <span style={{ flex: 1 }}>{r.text}</span>
                <span className="muted" style={{ fontSize: 11 }}>{r.time}</span>
              </div>
            ))
          ))}

        <div style={{ marginTop: 26 }}>
          <div className="row">
            <span>笔名</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input className="linein" style={{ width: 150, padding: "6px 0", fontSize: 14 }} maxLength={20} value={pen} onChange={(e) => setPen(e.target.value)} />
              <button
                className="text-btn"
                style={{ fontSize: 13 }}
                onClick={async () => {
                  const r = await editProfile(pen);
                  if (r.error) return toast(r.error);
                  toast("笔名改好了");
                  router.refresh();
                }}
              >
                保存
              </button>
            </span>
          </div>
          <div className="row">
            <span>深色（夜读模式）</span>
            <button className={`switch${dark ? " on" : ""}`} onClick={switchTheme} aria-label="切换主题" />
          </div>
          <div className="row">
            <span>黑名单（{props.blocks.length} 人）</span>
            <span className="muted" style={{ textAlign: "right", maxWidth: 200 }}>
              {props.blocks.length === 0
                ? "无人"
                : props.blocks.map((b) => (
                    <span key={b.id} style={{ marginLeft: 8, whiteSpace: "nowrap" }}>
                      <a href={`/u/${b.username}`} className="text-btn" style={{ fontSize: 12 }}>{b.penName}</a>
                      <button
                        className="muted"
                        style={{ marginLeft: 4, fontSize: 11, textDecoration: "underline" }}
                        onClick={async () => {
                          await toggleBlock(b.id);
                          toast("已解除拉黑");
                          router.refresh();
                        }}
                      >
                        解除
                      </button>
                    </span>
                  ))}
            </span>
          </div>
          <div className="row">
            <span>退出登录</span>
            <button
              className="muted"
              style={{ textDecoration: "underline" }}
              onClick={async () => {
                await logout();
              }}
            >
              下次再见
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
