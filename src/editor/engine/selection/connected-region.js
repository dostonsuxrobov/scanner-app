// Keeps only the part of a mask that is connected to a seed pixel through
// non-zero neighbours (left, right, up, down). This is what makes a color
// selection or a bucket fill "contiguous".
export function connectedRegion(mask, width, height, x, y) {
  const out = new Uint8ClampedArray(mask.length);
  if (x < 0 || y < 0 || x >= width || y >= height) return out;
  // Scanline fill: take a whole horizontal run at a time, then queue one
  // seed for each run that touches it in the rows above and below.
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop(), sx = stack.pop();
    const row = sy * width;
    if (!mask[row + sx] || out[row + sx]) continue;
    let left = sx, right = sx;
    while (left > 0 && mask[row + left - 1]) left--;
    while (right < width - 1 && mask[row + right + 1]) right++;
    for (let i = left; i <= right; i++) out[row + i] = mask[row + i];
    for (const ny of [sy - 1, sy + 1]) {
      if (ny < 0 || ny >= height) continue;
      const next = ny * width;
      for (let i = left; i <= right; i++)
        if (mask[next + i] && !out[next + i] && (i === left || !mask[next + i - 1])) stack.push(i, ny);
    }
  }
  return out;
}
