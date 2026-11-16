"use client";
// 互评浮层：立场五选 + 一句话（复刻原型 revSheet）
import { useEffect, useState } from "react";
import { addReview } from "@/actions/reviews";
import { STANCES } from "@/lib/validation";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";

export type ReviewTarget = { kind: "POST" | "POINT"; id: string; title: string };

type Rev = { stanceLabel: string; who: string; username: string; text: string; time: string };

export function ReviewSheet({
  target,
  loggedIn,
  onClose,
  onChanged,
}: {
  target: ReviewTarget;
  loggedIn: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [list, setList] = useState<Rev[] | null>(null);
  const [stance, setStance] = useState("RESONATE");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const pull = () =>
    fetch(`/api/reviews?target=${target.kind}:${target.id}`)
      .then((r) => r.json())
      .then((j) => setList(j.reviews || []))
      .catch(() => setList([]));

  useEffect(() => {
    pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, target.kind]);

  const submit = async () => {
    if (!loggedIn) return toast(NEED_LOGIN_MSG);
    if (busy) return;
    setBusy(true);
    const r = await addReview(target.kind, target.id, stance, text);
    setBusy(false);
    if (r.error === NEED_LOGIN) return toast(NEED_LOGIN_MSG);
    if (r.error) return toast(r.error);
    setText("");
    toast("评已落下。");
    pull();
    onChanged?.();
  };

  return (
    <div className="sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-in">
        <h3>互评 · {target.title.slice(0, 14)}…</h3>
        {list === null ? (
          <p className="muted">正在取评语…</p>
        ) : list.length ? (
          list.map((r, i) => (
            <div className="revline" key={i} style={{ borderBottom: "1px solid var(--hair)", padding: "9px 0", fontSize: 13 }}>
              <span className="rchip">{r.stanceLabel}</span>
              <span style={{ flex: 1 }}>
                {r.who}：{r.text}
              </span>
            </div>
          ))
        ) : (
          <p className="muted" style={{ padding: "10px 0" }}>
            还没有人评这一句。你来做第一个评审。
          </p>
        )}
        <div className="stances">
          {STANCES.map((s) => (
            <button
              key={s}
              className={stance === s ? "sel" : ""}
              onClick={() => setStance(s)}
            >
              {STANCE_CN[s]}
            </button>
          ))}
        </div>
        <div className="revform">
          <input
            className="linein"
            style={{ fontSize: 15 }}
            maxLength={60}
            placeholder="一句话评语（≤60字）"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button className="text-btn" onClick={submit}>
            落评
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 11 }}>
          互评是评审，不是聊天：先选一个立场，再写下那一句。
        </p>
      </div>
    </div>
  );
}

export const STANCE_CN: Record<string, string> = {
  RESONATE: "共鸣",
  ADMIRE: "拍案",
  DOUBT: "存疑",
  PUNCH: "补刀",
  EXTEND: "续写",
};
