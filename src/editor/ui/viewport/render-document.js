// Paints the flattened document into the viewport at the current pan/zoom.
// Only the visible part is drawn. Enlarged pixels stay crisp (nearest
// neighbour), reduced views are smoothed.
import { intersect, isEmptyRect } from "../../engine/rect.js";
import { checkerboard } from "./checkerboard.js";

export function renderDocument(ctx, { composite, view, dpr }) {
  const { width, height, zoom } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!composite) return;
  const docW = composite.width, docH = composite.height;
  const screen = { x: view.x, y: view.y, w: docW * zoom, h: docH * zoom };
  const clip = intersect(screen, { x: 0, y: 0, w: width, h: height });
  if (isEmptyRect(clip)) return;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fff";
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
  ctx.restore();
  ctx.fillStyle = checkerboard(ctx);
  ctx.fillRect(clip.x, clip.y, clip.w, clip.h);

  // Visible document region, expanded to whole source pixels.
  const sx = Math.max(0, Math.floor((clip.x - view.x) / zoom));
  const sy = Math.max(0, Math.floor((clip.y - view.y) / zoom));
  const ex = Math.min(docW, Math.ceil((clip.x + clip.w - view.x) / zoom));
  const ey = Math.min(docH, Math.ceil((clip.y + clip.h - view.y) / zoom));
  if (ex <= sx || ey <= sy) return;
  ctx.imageSmoothingEnabled = zoom < 1;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(composite, sx, sy, ex - sx, ey - sy, view.x + sx * zoom, view.y + sy * zoom, (ex - sx) * zoom, (ey - sy) * zoom);

  // Pixel grid at high magnification, as in GIMP and Photoshop.
  if (zoom >= 12) {
    ctx.beginPath();
    for (let x = sx; x <= ex; x++) {
      const px = Math.round(view.x + x * zoom) + 0.5;
      ctx.moveTo(px, view.y + sy * zoom);
      ctx.lineTo(px, view.y + ey * zoom);
    }
    for (let y = sy; y <= ey; y++) {
      const py = Math.round(view.y + y * zoom) + 0.5;
      ctx.moveTo(view.x + sx * zoom, py);
      ctx.lineTo(view.x + ex * zoom, py);
    }
    ctx.strokeStyle = "rgba(128,128,128,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
