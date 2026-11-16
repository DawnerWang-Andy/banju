import { BRAND } from "@/lib/brand";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return new NextResponse(
    JSON.stringify({
      name: BRAND.name,
      short_name: BRAND.name,
      description: BRAND.tagline,
      start_url: "/",
      display: "standalone",
      background_color: "#F5F5F1",
      theme_color: "#F5F5F1",
      lang: "zh-CN",
    }),
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
