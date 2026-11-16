"use client";
// 私信：列表 + 聊天窗，10 秒轮询（不做 WebSocket）
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, toggleBlock } from "@/actions/dms";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";

export type ConvoSummary = {
  id: string;
  otherId: string;
  name: string;
  last: string;
  unread: number;
};
type Msg = { id: string; mine: boolean; text: string; time: string };

export function InboxClient({
  userId,
  initialConvos,
  active,
  note,
}: {
  userId: string;
  initialConvos: ConvoSummary[];
  active: { id: string; name: string; otherId: string } | null;
  note: string;
}) {
  const router = useRouter();
  const [convos, setConvos] = useState(initialConvos);
  const [cur, setCur] = useState(active);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const curRef = useRef(cur);
  curRef.current = cur;

  const pullConvos = useCallback(async () => {
    try {
      const r = await fetch("/api/convs");
      if (r.ok) {
        const j = await r.json();
        setConvos(j.convos || []);
      }
    } catch {}
  }, []);

  const pullMsgs = useCallback(async () => {
    const c = curRef.current;
    if (!c) return;
    try {
      const r = await fetch(`/api/dm/${c.id}`);
      if (r.ok) {
        const j = await r.json();
        setMsgs(j.messages || []);
        setTimeout(() => bottom.current?.scrollIntoView({ block: "nearest" }), 30);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (curRef.current) pullMsgs();
      else pullConvos();
    }, 10000);
    if (cur) pullMsgs();
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id]);

  const open = (c: ConvoSummary) => {
    setCur({ id: c.id, name: c.name, otherId: c.otherId });
    router.replace(`/inbox?c=${c.id}`);
  };
  const back = () => {
    setCur(null);
    router.replace("/inbox");
    pullConvos();
  };

  const send = async () => {
    if (!cur) return;
    if (text.trim().length === 0) return;
    const r = await sendMessage(cur.id, text);
    if (r.error === NEED_LOGIN) return toast(NEED_LOGIN_MSG);
    if (r.error) return toast(r.error);
    setText("");
    pullMsgs();
    pullConvos();
  };

  if (cur) {
    return (
      <div className="chatcol">
        <div className="backbar" style={{ padding: "12px 16px 4px" }}>
          <button onClick={back}>←</button>
          <span className="who" style={{ fontSize: 15 }}>{cur.name}</span>
          <button
            className="muted"
            style={{ marginLeft: "auto", fontSize: 11, textDecoration: "underline" }}
            onClick={async () => {
              const r = await toggleBlock(cur.otherId);
              toast(r.blocked ? "已拉黑，双方消息互拦" : "已解除");
            }}
          >
            拉黑 TA
          </button>
        </div>
        <div className="msgs">
          <div className="muted" style={{ textAlign: "center", fontSize: 11, margin: "12px 0" }}>
            {note}
          </div>
          {msgs.map((m) => (
            <div key={m.id} className={`bubble ${m.mine ? "mine" : "theirs"}`}>
              {m.text}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3 }}>{m.time}</div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <div className="msgbar">
          <input
            className="msgin"
            maxLength={500}
            placeholder="说点什么…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="text-btn" onClick={send}>送出</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h2 style={{ marginTop: 0 }}>私信</h2>
      {convos.length === 0 && (
        <p className="muted" style={{ lineHeight: 2 }}>
          还没有会话。在别人的主页或句子旁点「私信 TA」开第一条——
          <br />
          只凭一支笔相识，聊得来再留印。
        </p>
      )}
      {convos.map((c) => (
        <div key={c.id} className="conv" onClick={() => open(c)} style={{ cursor: "pointer" }}>
          <div className="avatar">{c.name.slice(0, 1)}</div>
          <div className="mid">
            <b>{c.name}</b>
            <p>{c.last}</p>
          </div>
          {!!c.unread && <span className="dot" />}
        </div>
      ))}
      <p className="muted" style={{ marginTop: 16, fontSize: 11 }}>{note}</p>
      <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
        找不到聊天对象？<Link href="/" className="text-btn" style={{ fontSize: 11 }}>去广场刷两句</Link>
      </p>
    </div>
  );
}
