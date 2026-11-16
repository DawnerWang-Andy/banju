"use client";
// 举报弹层：五个理由，点了就走
import { useState } from "react";
import { report } from "@/actions/reviews";
import { toast, NEED_LOGIN, NEED_LOGIN_MSG } from "@/lib/ui";

const REASONS: [string, string][] = [
  ["obscene", "色情"],
  ["violent", "暴力"],
  ["political", "政治敏感"],
  ["spam", "骚扰广告"],
  ["other", "其他"],
];

export function ReportMenu({
  targetType,
  targetId,
  loggedIn,
}: {
  targetType: "POST" | "REVIEW" | "POINT" | "DM";
  targetId: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!loggedIn)
    return (
      <button
        onClick={() => toast(NEED_LOGIN_MSG)}
        aria-label="举报"
      >
        举
      </button>
    );
  return (
    <span style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="举报">
        举
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 22,
            background: "var(--paper)",
            border: "1px solid var(--hair)",
            borderRadius: 4,
            padding: "6px 4px",
            display: "flex",
            flexDirection: "column",
            zIndex: 8,
            width: 84,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {REASONS.map(([key, label]) => (
            <button
              key={key}
              style={{ padding: "5px 8px", textAlign: "left", fontSize: 12 }}
              onClick={async () => {
                setOpen(false);
                const r = await report(targetType, targetId, key);
                toast(r.error === NEED_LOGIN ? NEED_LOGIN_MSG : r.ok ? "已提交举报，进入管理员队列" : r.error || "失败");
              }}
            >
              {label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
