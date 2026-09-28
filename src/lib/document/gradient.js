// Gradient magnitude (Sobel), in gray levels per pixel.
export function gradientMagnitude(gray, width, height) {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1] - gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1];
      const gy = gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1] - gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1];
      out[i] = Math.hypot(gx, gy) / 8;
    }
  return out;
}
