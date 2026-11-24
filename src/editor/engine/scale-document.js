// Resamples the whole image to a new size. Every layer is scaled about the
// image's origin, so layers stay aligned with each other.
import { createCanvas } from "./canvas.js";
import { layerBounds } from "./layer.js";
import { fitsLimits, limitsMessage } from "./limits.js";

// A rectangle after scaling. Its edges are rounded, not its size, so layers
// that met before still meet; nothing shrinks below one pixel.
export function scaledRect(r, sx, sy) {
  const x = Math.round(r.x * sx), y = Math.round(r.y * sy);
  return { x, y, w: Math.max(1, Math.round((r.x + r.w) * sx) - x), h: Math.max(1, Math.round((r.y + r.h) * sy) - y) };
}

// Text layers become pixels: they are resampled like everything else.
export function scaleDocument(doc, width, height) {
  if (!fitsLimits(width, height)) throw new Error(`The image would be too large. ${limitsMessage()}`);
  const sx = width / doc.width, sy = height / doc.height;
  for (const layer of doc.layers) {
    const r = scaledRect(layerBounds(layer), sx, sy);
    const canvas = createCanvas(r.w, r.h);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(layer.canvas, 0, 0, r.w, r.h);
    Object.assign(layer, { canvas, x: r.x, y: r.y, text: null });
  }
  doc.width = width;
  doc.height = height;
}
