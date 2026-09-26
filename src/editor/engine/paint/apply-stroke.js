// Merges a stroke buffer into layer pixels. Used both for the live preview
// (into a scratch copy) and for the final commit (into the layer itself), so
// what you see while drawing is exactly what you get.
import { createScratch } from "../canvas.js";

const maskScratch = createScratch();

// stroke: { buffer, mode: "paint" | "erase", opacity (0–1), alphaLocked, clip, layerX, layerY }
// region: rect in layer coordinates; target draws region.x at (region.x - originX).
export function applyStroke(targetCtx, region, stroke, originX = 0, originY = 0) {
  const { x, y, w, h } = region;
  if (w <= 0 || h <= 0) return;
  let source = stroke.buffer.canvas;
  let sx = x, sy = y;
  if (stroke.clip) {
    const { canvas, ctx } = maskScratch(w, h);
    ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    ctx.globalCompositeOperation = "destination-in";
    // The clip canvas is in document coordinates.
    ctx.drawImage(stroke.clip, x + stroke.layerX, y + stroke.layerY, w, h, 0, 0, w, h);
    source = canvas;
    sx = 0;
    sy = 0;
  }
  targetCtx.save();
  targetCtx.globalAlpha = stroke.opacity;
  targetCtx.globalCompositeOperation =
    stroke.mode === "erase" ? "destination-out" : stroke.alphaLocked ? "source-atop" : "source-over";
  targetCtx.drawImage(source, sx, sy, w, h, x - originX, y - originY, w, h);
  targetCtx.restore();
}
