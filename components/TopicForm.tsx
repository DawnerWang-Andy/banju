"use client";
// 发起辩题：输入标题实时提示同类擂台（复刻原型 suggestTopics）
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createTopic } from "@/actions/topics";
import { toast } from "@/lib/ui";

export function TopicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [sug, setSug] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (title.trim().length < 2) {
      setSug([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/topics/suggest?q=${encodeURIComponent(title.trim())}`);
        const j = await r.json();
        setSug(j.items || []);
      } catch {}
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [title]);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    const r = await createTopic({ title, intro, pro, con });
    setBusy(false);
    if (r.error) return toast(r.error === "NEED_LOGIN" ? "请先登录" : r.error);
    if (r.id) {
      toast("擂台已开。");
      router.push(`/topics/${r.id}`);
    }
  };

  return (
    <div style={{ paddingTop: 10 }}>
      <h2 style={{ fontFamily: "var(--serif)", margin: "0 0 16px" }}>发起一个辩题</h2>
      <input
        className="linein"
        maxLength={50}
        placeholder="辩题（≤50字）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      {sug.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="muted">已有相近的擂台，直接去踢馆？</p>
          {sug.map((s) => (
            <div key={s.id} className="simitem">
              <span>{s.title}</span>
              <button className="text-btn" style={{ fontSize: 12 }} onClick={() => router.push(`/topics/${s.id}`)}>
                进入 →
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        className="linein"
        maxLength={100}
        placeholder="给读者一句背景（可选）"
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        style={{ marginTop: 14, fontSize: 14 }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input className="linein" maxLength={10} placeholder="正方叫什么（如：加深）" value={pro} onChange={(e) => setPro(e.target.value)} style={{ fontSize: 14 }} />
        <input className="linein" maxLength={10} placeholder="反方叫什么（如：削薄）" value={con} onChange={(e) => setCon(e.target.value)} style={{ fontSize: 14 }} />
      </div>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <button className="primary-btn" disabled={busy || title.trim().length < 4} onClick={go}>
          开擂
        </button>
      </div>
      <p className="muted" style={{ marginTop: 16, lineHeight: 1.8 }}>
        平台会自动把辩题做成关键词指纹：相近的题会被提示归并，开擂后题页生成擂台简报（双方高频词与参战统计）。
      </p>
    </div>
  );
}
