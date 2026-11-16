// 会话：自研轻量 session（不用 NextAuth）
// cookie: httpOnly + sameSite=lax；secure 由 COOKIE_SECURE 环境变量控制
// （局域网 http 测试时必须 false，否则手机上根本写不进 cookie）
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

const COOKIE = "sid";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000; // 30 天滑动

export type SessionUser = {
  id: string;
  username: string;
  penName: string;
  role: string;
  banned: boolean;
  createdAt: Date;
} | null;

export async function createSession(userId: string) {
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.session.create({
    data: { id: token, userId, expiresAt: new Date(Date.now() + MAX_AGE_MS) },
  });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  });
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await prisma.session.delete({ where: { id: token } }).catch(() => {});
  cookies().delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  // 滑动过期：剩余不足 7 天就续期（避免每次请求都写库）
  if (s.expiresAt.getTime() - Date.now() < 7 * 24 * 3600 * 1000) {
    await prisma.session
      .update({ where: { id: token }, data: { expiresAt: new Date(Date.now() + MAX_AGE_MS) } })
      .catch(() => {});
  }
  if (s.user.banned) return null;
  return s.user;
}

export const UNAUTHORIZED = "NEED_LOGIN";

/** 写操作统一入口：未登录抛错给 action 返回值处理 */
export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error(UNAUTHORIZED);
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new Error("FORBIDDEN");
  return u;
}
