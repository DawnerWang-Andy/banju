"use client";
// 底栏 + 顶栏铃铛（未读轮询）
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/", label: "刷" },
  { href: "/topics", label: "题" },
  { href: "/inbox", label: "信" },
  { href: "/me", label: "我" },
];

export function BottomNav({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} className={path === t.href ? "on" : ""}>
          {t.label}
        </a>
      ))}
      {isAdmin && (
        <a href="/admin" className={path === "/admin" ? "on" : ""}>
          管
        </a>
      )}
      {!loggedIn && (
        <a href="/login" className={path === "/login" ? "on" : ""}>
          录
        </a>
      )}
    </nav>
  );
}

export function Bell({ loggedIn }: { loggedIn: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!loggedIn) return;
    let stop = false;
    const pull = async () => {
      try {
        const r = await fetch("/api/unread");
        const j = await r.json();
        if (!stop) setN(j.count || 0);
      } catch {}
    };
    pull();
    const t = setInterval(pull, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [loggedIn]);
  return (
    <Link href="/inbox" className="bell" aria-label="私信">
      信{!!n && <b>{n > 99 ? "99+" : n}</b>}
    </Link>
  );
}
