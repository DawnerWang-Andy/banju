// GET /api/reviews?target=POST:cwid → 该内容的全部可见互评（公开）
import { prisma } from "@/lib/prisma";
import { STANCE_LABEL } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("target") || "";
  const [targetType, targetId] = q.split(":");
  if (!["POST", "POINT"].includes(targetType) || !targetId)
    return NextResponse.json({ error: "bad target" }, { status: 400 });
  const rows = await prisma.review.findMany({
    where: { targetType, targetId, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: {
      stance: true,
      content: true,
      createdAt: true,
      user: { select: { penName: true, username: true } },
    },
  });
  return NextResponse.json({
    reviews: rows.map((r) => ({
      stanceLabel: STANCE_LABEL[r.stance] || r.stance,
      who: r.user.penName,
      username: r.user.username,
      text: r.content,
      time: new Date(r.createdAt).toLocaleString("zh-CN", { hour12: false }),
    })),
  });
}
