// 该临时诊断路由已下线（保留文件为占位；产品接口是 /api/whoami）
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ removed: true, use: "/api/whoami" }, { status: 410 });
}
