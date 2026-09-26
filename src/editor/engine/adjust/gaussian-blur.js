// Gaussian blur approximation (three box passes) on premultiplied RGBA, so
// transparent pixels do not darken edges.
export function gaussianBlur(data, width, height, radius) {
  if (radius <= 0) return data;
  const sizes = boxSizes(radius, 3);
  const n = width * height;
  const channels = [0, 1, 2, 3].map(() => new Float32Array(n));
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = data[p + 3] / 255;
    channels[0][i] = data[p] * a;
    channels[1][i] = data[p + 1] * a;
    channels[2][i] = data[p + 2] * a;
    channels[3][i] = data[p + 3];
  }
  const tmp = new Float32Array(n);
  for (const ch of channels)
    for (const size of sizes) {
      const r = (size - 1) / 2;
      boxPass(ch, tmp, width, height, r, true);
      boxPass(tmp, ch, width, height, r, false);
    }
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = channels[3][i];
    const k = a > 0 ? 255 / a : 0;
    data[p] = channels[0][i] * k;
    data[p + 1] = channels[1][i] * k;
    data[p + 2] = channels[2][i] * k;
    data[p + 3] = a;
  }
  return data;
}

// Box widths whose repeated application approximates a Gaussian of sigma.
function boxSizes(sigma, n) {
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower--;
  const upper = lower + 2;
  const m = Math.round((12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) / (-4 * lower - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? lower : upper));
}

function boxPass(src, dst, width, height, r, horizontal) {
  if (r <= 0) {
    dst.set(src);
    return;
  }
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? 1 : width;
  const scale = 1 / (r * 2 + 1);
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width : line;
    let sum = 0;
    // Edges are treated as transparent, matching how layers fade at their bounds.
    for (let i = 0; i <= r && i < length; i++) sum += src[start + i * step];
    for (let i = 0; i < length; i++) {
      dst[start + i * step] = sum * scale;
      if (i + r + 1 < length) sum += src[start + (i + r + 1) * step];
      if (i - r >= 0) sum -= src[start + (i - r) * step];
    }
  }
}
