// Separable single-channel filters on Float32 images (edges clamp).
function pass(src, width, height, radius, horizontal, pick) {
  const out = new Float32Array(src.length);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? 1 : width;
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * width : line;
    for (let i = 0; i < length; i++) {
      let acc = pick === "max" ? -Infinity : 0;
      for (let k = -radius; k <= radius; k++) {
        const v = src[start + Math.min(length - 1, Math.max(0, i + k)) * step];
        acc = pick === "max" ? (v > acc ? v : acc) : acc + v;
      }
      out[start + i * step] = pick === "max" ? acc : acc / (radius * 2 + 1);
    }
  }
  return out;
}

export function boxBlur(gray, width, height, radius) {
  if (radius < 1) return gray;
  return pass(pass(gray, width, height, radius, true, "mean"), width, height, radius, false, "mean");
}

// Grey-level dilation: each pixel becomes the brightest value nearby, which
// erases dark strokes (text) and leaves the paper's lighting.
export function maxFilter(gray, width, height, radius) {
  if (radius < 1) return gray;
  return pass(pass(gray, width, height, radius, true, "max"), width, height, radius, false, "max");
}
