"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, register } from "@/actions/auth";
import { toast } from "@/lib/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [penName, setPenName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const r =
      mode === "login"
        ? await login({ username, password })
        : await register({ username, penName, password });
    setBusy(false);
    if (r?.error) return setErr(r.error);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="page-scroll">
      <div className="wrap" style={{ maxWidth: 420, margin: "0 auto", paddingTop: 40 }}>
        <h2 style={{ marginTop: 0 }}>{mode === "login" ? "回到半句" : "落座半句"}</h2>
        <p className="muted" style={{ marginBottom: 18 }}>
          {mode === "login"
            ? "用户名 + 密码，仅此而已。"
            : "用户名是唯一身份，笔名可以随便起、随时改——不需要邮箱手机号。"}
        </p>
        <input
          className="linein"
          placeholder="用户名（3-20 位字母数字下划线）"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
        />
        {mode === "register" && (
          <input
            className="linein"
            placeholder="笔名（1-20 字，可与他人重复）"
            value={penName}
            onChange={(e) => setPenName(e.target.value)}
            style={{ marginTop: 14 }}
          />
        )}
        <input
          className="linein"
          type="password"
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginTop: 14 }}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 22 }}>
          <button className="primary-btn" disabled={busy} onClick={go}>
            {mode === "login" ? "登录" : "注册并进入"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 18 }}>
          {mode === "login" ? (
            <>
              还没有位置？<a href="/register" className="text-btn">注册一个</a>
            </>
          ) : (
            <>
              已经有半句了？<a href="/login" className="text-btn">直接登录</a>
            </>
          )}
        </p>
        {mode === "register" && (
          <p className="muted" style={{ marginTop: 24, lineHeight: 1.8 }}>
            注册即同意社区约定：不发违法内容；被互评「存疑」不必难过，那也是被人认真读过。
          </p>
        )}
      </div>
    </div>
  );
}
