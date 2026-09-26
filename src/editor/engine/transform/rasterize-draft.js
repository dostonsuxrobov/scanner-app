// Renders a transform draft into a new layer canvas positioned in the document.
import { createCanvas } from "../canvas.js";
import { fitsLimits, limitsMessage } from "../limits.js";
import { draftBounds, draftMatrix } from "./transform-draft.js";

export function rasterizeDraft(draft, { smoothing = true } = {}) {
  const bounds = draftBounds(draft);
  if (!fitsLimits(bounds.w, bounds.h)) throw new Error(`The transformed layer is too large. ${limitsMessage()}`);
  const canvas = createCanvas(bounds.w, bounds.h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = "high";
  const [a, b, c, d, e, f] = draftMatrix(draft);
  ctx.setTransform(a, b, c, d, e - bounds.x, f - bounds.y);
  ctx.drawImage(draft.source, 0, 0);
  return { canvas, x: bounds.x, y: bounds.y };
}
