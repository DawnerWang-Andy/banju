"use server";
// 注册 / 登录 / 退出 / 改笔名
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, requireUser } from "@/lib/session";
import { validRegister, validProfileEdit } from "@/lib/validation";
import { limited } from "@/lib/rate";

export type FormResult = { error?: string; ok?: boolean };

const ADMIN_NAMES = () =>
  (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export async function register(input: {
  username: string;
  penName: string;
  password: string;
}): Promise<FormResult> {
  const username = String(input.username || "").trim();
  const penName = String(input.penName || "").trim();
  const password = String(input.password || "");
  if (limited(`reg:${username}`, 3, 60 * 60 * 1000)) return { error: "注册太频繁，稍后再试" };
  const err = validRegister(username, penName, password);
  if (err) return { error: err };
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "这个用户名已被占了，换一个" };
  const passwordHash = await bcrypt.hash(password, 10);
  const role = ADMIN_NAMES().includes(username) ? "ADMIN" : "USER";
  const u = await prisma.user.create({ data: { username, penName, passwordHash, role } });
  await createSession(u.id);
  redirect("/");
}

export async function login(input: { username: string; password: string }): Promise<FormResult> {
  const username = String(input.username || "").trim();
  const password = String(input.password || "");
  if (limited(`login:${username}`, 5, 60 * 1000)) return { error: "试得太快，一分钟后重来" };
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) return { error: "用户名或密码不对" };
  const good = await bcrypt.compare(password, u.passwordHash);
  if (!good) return { error: "用户名或密码不对" };
  if (u.banned) return { error: "这个账号已停摆" };
  await createSession(u.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function editProfile(penNameRaw: string): Promise<FormResult> {
  const u = await requireUser();
  const penName = String(penNameRaw || "").trim();
  const err = validProfileEdit(penName);
  if (err) return { error: err };
  await prisma.user.update({ where: { id: u.id }, data: { penName } });
  revalidatePath("/me");
  revalidatePath(`/u/${u.username}`);
  return { ok: true };
}
