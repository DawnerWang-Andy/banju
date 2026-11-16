"use client";
// 发布页：稿纸 + 类型四选一 + 字数环 + 先评后创引导（复刻原型 5.6）
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publish } from "@/actions/posts";
import { toast } from "@/lib/ui";

const TYPES: [string, string, number][] = [
  ["PHILOSOPHY", "思", 300],
  ["JOKE", "噱", 300],
  ["MEME", "梗", 300],
  ["ESSAY", "记", 500],
];

export function ComposeForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [type, setType] = useState<[string, string, number]>(TYPES[0]);
  const [busy, setBusy] = useState(false);

  const len = text.trim().length;
  const max = type[2];
  const dash = 87.96 * (1 - Math.min(len, max) / max);

  const go = async () => {
    if (busy || len < 5) return;
    setBusy(true);
    const r = await publish(text, type[0]);
    setBusy(false);
    if (r.error === "NEED_LOGIN") return toast("登录后才能发布");
    if (r.error) return toast(r.error);
    if (!r.ok) return;
    toast(r.pending ? "内容已提交，正在人工审核" : r.nudged ? "发布成功。回评 2 条，你的句子更容易被读到" : "发布成功。已落座半句广场");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="page-scroll">
      <div className="wrap">
        <h2 style={{ marginTop: 0 }}>写下你的半句</h2>
        <textarea
          className="penarea"
          maxLength={max}
          placeholder="一句哲思、一个笑话、一条梗，或者三行小记…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="penrow">
          <div className="types">
            {TYPES.map((t) => (
              <button key={t[0]} className={type[0] === t[0] ? "sel" : ""} onClick={() => setType(t)}>
                {t[1]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="ring">
              <svg width="34" height="34" viewBox="0 0 34 34">
                <circle cx="17" cy="17" r="14" fill="none" stroke="var(--hair)" strokeWidth="2" />
                <circle
                  cx="17" cy="17" r="14" fill="none" stroke="var(--seal)" strokeWidth="2"
                  strokeDasharray="87.96" strokeDashoffset={dash}
                  transform="rotate(-90 17 17)" strokeLinecap="round"
                />
              </svg>
              <i>{len}</i>
            </div>
            <button className="primary-btn" disabled={len < 5 || busy} style={{ marginLeft: 12 }} onClick={go}>
              发布
            </button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          上限 {max} 字{type[0] === "ESSAY" ? "（随笔放宽）" : ""}。命中敏感词会先进人工审核，不会公开示众。
        </p>
      </div>
    </div>
  );
}
