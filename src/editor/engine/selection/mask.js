// Pure 8-bit coverage masks (one byte per document pixel, 0–255).
export const fullMask = (width, height) => new Uint8ClampedArray(width * height).fill(255);

export function invertMask(mask) {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = 255 - mask[i];
  return out;
}

export function combineMasks(base, next, mode) {
  if (mode === "replace") return next;
  if (!base) return mode === "add" ? next : new Uint8ClampedArray(next.length);
  const out = new Uint8ClampedArray(next.length);
  for (let i = 0; i < next.length; i++) {
    const a = base[i];
    const b = next[i];
    out[i] = mode === "add" ? (a > b ? a : b) : mode === "subtract" ? a - b : a < b ? a : b;
  }
  return out;
}

export function translateMask(mask, width, height, dx, dy) {
  const result = new Uint8ClampedArray(mask.length);
  const left = Math.max(0, -dx);
  const right = Math.min(width, width - dx);
  if (right <= left) return result;
  for (let y = 0; y < height; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    result.set(mask.subarray(y * width + left, y * width + right), ny * width + left + dx);
  }
  return result;
}

// Rasterizes a (optionally rounded) rectangle or an ellipse with antialiased edges.
export function shapeMask(width, height, rect, { kind = "rect", radius = 0 } = {}) {
  const mask = new Uint8ClampedArray(width * height);
  const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
  const top = Math.max(0, Math.floor(y0));
  const bottom = Math.min(height, Math.ceil(y1));
  const r = kind === "rect" ? Math.max(0, Math.min(radius, rect.w / 2, rect.h / 2)) : 0;
  for (let y = top; y < bottom; y++) {
    // Sample the row centre and weight partial rows by vertical coverage.
    const cy = y + 0.5;
    const vertical = Math.min(1, Math.min(y + 1, y1) - Math.max(y, y0));
    if (vertical <= 0) continue;
    let inset = 0;
    if (kind === "ellipse") {
      const ry = rect.h / 2, rx = rect.w / 2, dy = (cy - (y0 + ry)) / ry;
      if (Math.abs(dy) >= 1) continue;
      inset = rx - rx * Math.sqrt(1 - dy * dy);
    } else if (r > 0) {
      const d = cy < y0 + r ? y0 + r - cy : cy > y1 - r ? cy - (y1 - r) : 0;
      if (d > 0) inset = r - Math.sqrt(Math.max(0, r * r - d * d));
    }
    const left = x0 + inset, right = x1 - inset;
    if (right <= left) continue;
    const from = Math.max(0, Math.floor(left));
    const to = Math.min(width, Math.ceil(right));
    const row = y * width;
    for (let x = from; x < to; x++) {
      const horizontal = Math.min(x + 1, right) - Math.max(x, left);
      mask[row + x] = Math.round(255 * Math.max(0, Math.min(1, horizontal)) * vertical);
    }
  }
  return mask;
}

// Approximates a Gaussian feather with three separable box-blur passes.
export function featherMask(mask, width, height, radius) {
  if (radius <= 0) return mask;
  const box = Math.max(1, Math.round(radius / 1.5));
  let a = Float32Array.from(mask);
  let b = new Float32Array(mask.length);
  for (let pass = 0; pass < 3; pass++) {
    blurLine(a, b, width, height, box, true);
    blurLine(b, a, width, height, box, false);
  }
  return Uint8ClampedArray.from(a, (v) => Math.round(v));
}

function blurLine(src, dst, width, height, r, horizontal) {
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? 1 : width;
  const scale = 1 / (r * 2 + 1);
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width : line;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[start + Math.min(length - 1, Math.max(0, i)) * step];
    for (let i = 0; i < length; i++) {
      dst[start + i * step] = sum * scale;
      const add = Math.min(length - 1, i + r + 1);
      const remove = Math.max(0, i - r);
      sum += src[start + add * step] - src[start + remove * step];
    }
  }
}
