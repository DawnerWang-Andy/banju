// GET /api/topics/suggest?q=标题 → 同类擂台建议（Jaccard ≥ 0.12，最多 3 条）
import { prisma } from "@/lib/prisma";
import { kwset, jaccard, topicSigFromKwJson, SUGGEST_THRESHOLD } from "@/lib/keywords";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ items: [] });
  const open = await prisma.topic.findMany({
    where: { status: "OPEN", modStatus: "PUBLISHED" },
    select: { id: true, title: true, keywords: true },
    take: 300,
    orderBy: { createdAt: "desc" },
  });
  const sig = kwset(q);
  const items = open
    .map((t) => ({ id: t.id, title: t.title, s: jaccard(sig, topicSigFromKwJson(t.keywords)) }))
    .filter((x) => x.s >= SUGGEST_THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  return NextResponse.json({ items });
}
