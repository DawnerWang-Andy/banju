"use client";
// 管理后台：举报 / 待审 / 敏感词 / 用户 / 话题
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addWord,
  handleReport,
  moderatePending,
  removeWord,
  setBanned,
} from "@/actions/admin";
import { closeTopic } from "@/actions/topics";
import { toast } from "@/lib/ui";
import { DM_PRIVACY_NOTE } from "@/lib/copy";

export type AdminData = {
  stats: { users: number; posts: number; reviews: number; topics: number };
  reports: { id: string; targetType: string; reason: string; detail: string | null; reporter: string; time: string; text: string }[];
  pendingPosts: { id: string; text: string; who: string; type: string; time: string }[];
  pendingPoints: { id: string; text: string; who: string; topic: string; time: string }[];
  words: { id: string; word: string; level: string }[];
  users: { id: string; username: string; penName: string; role: string; banned: boolean; time: string }[];
  topics: { id: string; title: string; status: string; points: number; creator: string }[];
};

const REASON_CN: Record<string, string> = {
  obscene: "色情",
  violent: "暴力",
  political: "政治敏感",
  spam: "骚扰广告",
  other: "其他",
};

export function AdminClient({ data }: { data: AdminData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "pending" | "words" | "users" | "topics">("reports");
  const [q, setQ] = useState("");
  const [newWord, setNewWord] = useState("");
  const [newLevel, setNewLevel] = useState<"BLOCK" | "FILTER">("BLOCK");

  const act = (p: Promise<{ error?: string; ok?: boolean }>, msg: string) =>
    p.then((r) => {
      toast(r.ok ? msg : r.error || "失败");
      router.refresh();
    });

  return (
    <div style={{ paddingTop: 8 }}>
      <h2 style={{ fontFamily: "var(--serif)", margin: "0 0 4px" }}>管理后台</h2>
      <p className="muted">
        {data.stats.users} 人 · {data.stats.posts} 句 · {data.stats.reviews} 评 · {data.stats.topics} 擂
      </p>
      <div className="admin-tabs">
        {(
          [
            ["reports", `举报（${data.reports.length}）`],
            ["pending", `待审（${data.pendingPosts.length + data.pendingPoints.length}）`],
            ["words", "敏感词"],
            ["users", "用户"],
            ["topics", "话题"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={tab === key ? "sel" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "reports" && (
        <>
          {data.reports.length === 0 && <p className="muted">队列干净。</p>}
          {data.reports.map((r) => (
            <div key={r.id} style={{ borderBottom: "1px solid var(--hair)", padding: "12px 0" }}>
              <p className="muted">
                [{r.targetType}] {REASON_CN[r.reason] || r.reason} · 来自 {r.reporter} · {r.time}
                {r.detail ? ` · 补充：${r.detail}` : ""}
              </p>
              <p style={{ fontFamily: "var(--serif)", fontSize: 14, margin: "6px 0 10px", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {r.text}
              </p>
              <div>
                <button className="adm-btn go" onClick={() => act(handleReport(r.id, "REMOVE"), "已下架目标")}>
                  下架
                </button>
                <button className="adm-btn" onClick={() => act(handleReport(r.id, "IGNORE"), "已忽略")}>
                  忽略
                </button>
              </div>
            </div>
          ))}
          {data.reports.some((r) => r.targetType === "DM") && (
            <p className="muted" style={{ marginTop: 12, fontSize: 11 }}>{DM_PRIVACY_NOTE}</p>
          )}
        </>
      )}

      {tab === "pending" && (
        <>
          {data.pendingPosts.length + data.pendingPoints.length === 0 && (
            <p className="muted">没有待审内容。</p>
          )}
          {data.pendingPosts.map((p) => (
            <div key={p.id} style={{ borderBottom: "1px solid var(--hair)", padding: "12px 0" }}>
              <p className="muted">句子「{p.type}」· {p.who} · {p.time}</p>
              <p style={{ fontFamily: "var(--serif)", fontSize: 14, margin: "6px 0 10px", whiteSpace: "pre-wrap" }}>{p.text}</p>
              <div>
                <button className="adm-btn go" onClick={() => act(moderatePending("POST", p.id, true), "已发布")}>通过</button>
                <button className="adm-btn" onClick={() => act(moderatePending("POST", p.id, false), "已驳回")}>驳回</button>
              </div>
            </div>
          ))}
          {data.pendingPoints.map((p) => (
            <div key={p.id} style={{ borderBottom: "1px solid var(--hair)", padding: "12px 0" }}>
              <p className="muted">论据 · {p.who} · 话题《{p.topic}》 · {p.time}</p>
              <p style={{ fontFamily: "var(--serif)", fontSize: 14, margin: "6px 0 10px" }}>{p.text}</p>
              <div>
                <button className="adm-btn go" onClick={() => act(moderatePending("POINT", p.id, true), "已发布")}>通过</button>
                <button className="adm-btn" onClick={() => act(moderatePending("POINT", p.id, false), "已驳回")}>驳回</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "words" && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 14px", alignItems: "center" }}>
            <input className="linein" style={{ flex: 1, fontSize: 14 }} placeholder="新词条" maxLength={20} value={newWord} onChange={(e) => setNewWord(e.target.value)} />
            <div className="pick" style={{ margin: 0, gap: 6 }}>
              <button className={newLevel === "BLOCK" ? "pro sel" : "pro"} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setNewLevel("BLOCK")}>拦</button>
              <button className={newLevel === "FILTER" ? "con sel" : "con"} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setNewLevel("FILTER")}>筛</button>
            </div>
            <button className="text-btn" onClick={() => { act(addWord(newWord, newLevel), "词条已加"); setNewWord(""); }}>加</button>
          </div>
          <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
            拦＝公开内容进待审、私信直接拦截；筛＝发布时替换为 *。当前 {data.words.length} 条。
          </p>
          {data.words.map((w) => (
            <div key={w.id} className="row" style={{ padding: "9px 0", fontSize: 14 }}>
              <span style={{ fontFamily: "var(--serif)" }}>{w.word}</span>
              <span className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {w.level === "BLOCK" ? "拦" : "筛"}
                <button className="adm-btn" onClick={() => act(removeWord(w.id), "词条已删")}>删</button>
              </span>
            </div>
          ))}
        </>
      )}

      {tab === "users" && (
        <>
          <input className="linein" style={{ fontSize: 14, marginBottom: 12 }} placeholder="搜用户名或笔名…" value={q} onChange={(e) => setQ(e.target.value)} />
          {data.users
            .filter((u) => !q || u.username.includes(q) || u.penName.includes(q))
            .map((u) => (
              <div key={u.id} className="row" style={{ padding: "11px 0" }}>
                <span>
                  {u.penName}
                  <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>@{u.username} · {u.time}{u.role === "ADMIN" ? " · 管理员" : ""}</span>
                </span>
                {u.role !== "ADMIN" && (
                  <button
                    className={`adm-btn${u.banned ? "" : " go"}`}
                    onClick={() => act(setBanned(u.id, !u.banned), u.banned ? "已解封" : "已封禁")}
                  >
                    {u.banned ? "解封" : "封禁"}
                  </button>
                )}
              </div>
            ))}
        </>
      )}

      {tab === "topics" && (
        <>
          {data.topics.length === 0 && <p className="muted">还没有话题。</p>}
          {data.topics.map((t) => (
            <div key={t.id} className="row" style={{ padding: "11px 0" }}>
              <span>
                {t.title}
                <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                  {t.creator} · {t.points} 论据{t.status === "CLOSED" ? " · 已闭" : ""}
                </span>
              </span>
              {t.status === "OPEN" && (
                <button className="adm-btn go" onClick={() => act(closeTopic(t.id), "已闭题")}>闭题</button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
