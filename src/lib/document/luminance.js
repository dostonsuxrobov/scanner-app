// Grayscale helpers shared by the document pipeline (Rec. 601 weights).
export function luminance(data, width, height) {
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4)
    out[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  return out;
}

// Area-average downscale of a single-channel image so its long side is at
// most `maxSide`. Returns the image and the scale (small / original).
export function downscale(gray, width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const out = new Float32Array(w * h);
  const counts = new Float32Array(w * h);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(h - 1, Math.floor(y * scale));
    for (let x = 0; x < width; x++) {
      const i = sy * w + Math.min(w - 1, Math.floor(x * scale));
      out[i] += gray[y * width + x];
      counts[i]++;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= counts[i] || 1;
  return { gray: out, width: w, height: h, scale: w / width };
}
