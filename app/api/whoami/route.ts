// GET /api/whoami → 轻量登录态自检（前端与运维排障用）
import { getCurrentUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  return NextResponse.json({
    logged: !!u,
    username: u?.username ?? null,
    penName: u?.penName ?? null,
    role: u?.role ?? null,
  });
}
