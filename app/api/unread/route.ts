// GET /api/unread → { count }
import { getCurrentUser } from "@/lib/session";
import { getUnreadCount } from "@/lib/feed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await getUnreadCount(u.id) });
}
