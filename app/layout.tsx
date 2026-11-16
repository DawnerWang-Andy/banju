import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { BRAND } from "@/lib/brand";
import { BottomNav, Bell } from "@/components/Chrome";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: "短视频化阅读的短文字社区：刷别人的半句，落座自己的擂台，人人创作，人人互评。",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F5F1",
};

// 主题初始化：localStorage 优先，其次跟随系统（在渲染前执行，防闪白/闪黑）
const themeInit = `(function(){try{var s=localStorage.getItem("banju-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <div className="app">
          <header>
            <Link href="/" aria-label={BRAND.name}>
              <div className="logo">{BRAND.sealChar}</div>
            </Link>
            <div className="head-r">
              <Bell loggedIn={!!user} />
              <Link href={user ? "/me" : "/login"} style={{ fontSize: 12, color: "var(--meta)" }}>
                {user ? user.penName : "登录"}
              </Link>
            </div>
          </header>
          <main>{children}</main>
          <BottomNav loggedIn={!!user} isAdmin={user?.role === "ADMIN"} />
        </div>
      </body>
    </html>
  );
}
