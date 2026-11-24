// Quarter turns and mirror flips of the whole image. They only move pixels
// (no resampling), so they are lossless and can be repeated freely.
// `how`: "cw" | "ccw" | "half" | "flipH" | "flipV".
import { createCanvas } from "../canvas.js";

const quarter = (how) => how === "cw" || how === "ccw";

// Size of a width × height image after the turn.
export const turnedSize = (width, height, how) => (quarter(how) ? { width: height, height: width } : { width, height });

// Where a rectangle of a width × height image lands.
export function turnRect(r, width, height, how) {
  if (how === "cw") return { x: height - r.y - r.h, y: r.x, w: r.h, h: r.w };
  if (how === "ccw") return { x: r.y, y: width - r.x - r.w, w: r.h, h: r.w };
  return { x: how === "flipV" ? r.x : width - r.x - r.w, y: how === "flipH" ? r.y : height - r.y - r.h, w: r.w, h: r.h };
}

// The same move for a one-byte-per-pixel mask (the selection).
export function turnMask(mask, width, height, how) {
  const out = new Uint8ClampedArray(mask.length);
  const outWidth = turnedSize(width, height, how).width;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const nx = how === "cw" ? height - 1 - y : how === "ccw" ? y : how === "flipV" ? x : width - 1 - x;
      const ny = how === "cw" ? x : how === "ccw" ? width - 1 - x : how === "flipH" ? y : height - 1 - y;
      out[ny * outWidth + nx] = mask[y * width + x];
    }
  return out;
}

// Canvas transform that carries a w × h canvas onto its turned copy.
const MATRIX = {
  cw: (w, h) => [0, 1, -1, 0, h, 0],
  ccw: (w) => [0, -1, 1, 0, 0, w],
  half: (w, h) => [-1, 0, 0, -1, w, h],
  flipH: (w) => [-1, 0, 0, 1, w, 0],
  flipV: (w, h) => [1, 0, 0, -1, 0, h],
};

function turnCanvas(source, how) {
  const { width, height } = turnedSize(source.width, source.height, how);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(...MATRIX[how](source.width, source.height));
  ctx.drawImage(source, 0, 0);
  return canvas;
}

// Turns every layer (hidden ones too, so they stay in place) and the image
// size. Text layers become pixels: text cannot be drawn rotated or mirrored.
export function turnDocument(doc, how) {
  for (const layer of doc.layers) {
    const r = turnRect({ x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height }, doc.width, doc.height, how);
    Object.assign(layer, { canvas: turnCanvas(layer.canvas, how), x: r.x, y: r.y, text: null });
  }
  Object.assign(doc, turnedSize(doc.width, doc.height, how));
}
