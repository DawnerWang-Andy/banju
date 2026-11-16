"use client";
// 分享句子卡片：3:4 竖版 + canvas 逐字断行导出（复刻原型 savePoster）
import { BRAND } from "@/lib/brand";
import { toast } from "@/lib/ui";

export function SharePoster({
  post,
  onClose,
}: {
  post: { id: string; content: string; authorName: string };
  onClose: () => void;
}) {
  const link = `${BRAND.url ? BRAND.url.replace(/\/$/, "") : ""}/p/${post.id}`;

  const save = () => {
    const W = 600, H = 800;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    if (!g) return;
    const dark = document.documentElement.dataset.theme === "dark";
    g.fillStyle = dark ? "#16181A" : "#F5F5F1";
    g.fillRect(0, 0, W, H);
    g.fillStyle = dark ? "#E9E6DD" : "#1B1A17";
    const fs = 44;
    g.font = `${fs}px "Songti SC","Noto Serif SC",SimSun,serif`;
    const lines: string[] = [];
    post.content.split("\n").forEach((seg) => {
      let cur = "";
      for (const ch of seg) {
        if (g.measureText(cur + ch).width > W - 160) { lines.push(cur); cur = ch; }
        else cur += ch;
      }
      lines.push(cur);
    });
    let y = 140;
    lines.forEach((L) => { g.fillText(L, 80, y); y += fs * 1.9; });
    g.save();
    g.translate(W - 140, H - 210);
    g.rotate((-4 * Math.PI) / 180);
    g.fillStyle = "#C2402E";
    g.beginPath();
    if (typeof (g as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === "function")
      (g as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(-36, -36, 72, 72, 8);
    else g.rect(-36, -36, 72, 72);
    g.fill();
    g.fillStyle = "#F5F5F1";
    g.font = '42px "Songti SC",serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(BRAND.sealChar, 0, 4);
    g.restore();
    g.fillStyle = "#8F8A7E";
    g.font = "20px sans-serif";
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillText(`${post.authorName} 于「${BRAND.name}」${link ? " · " + link : ""}`, 80, H - 80);
    const a = document.createElement("a");
    a.download = `${BRAND.name}-${post.id}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    toast("句子卡片已保存");
  };

  const copy = async () => {
    if (!link) return toast("尚未配置站点网址（NEXT_PUBLIC_SITE_URL）");
    try {
      await navigator.clipboard.writeText(link);
      toast("链接已复制");
    } catch {
      prompt("手动复制这个链接：", link);
    }
  };

  return (
    <div className="poster-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="poster-box">
        <div className="poster">
          <div className="pt">{post.content}</div>
          <div className="grow" />
          <div className="pf">
            <span>
              {post.authorName} 于「{BRAND.name}」
            </span>
            <div className="sealmini">{BRAND.sealChar}</div>
          </div>
        </div>
        <div className="share-btns">
          <button onClick={save}>存为图片</button>
          <button onClick={copy}>复制链接</button>
        </div>
      </div>
    </div>
  );
}
