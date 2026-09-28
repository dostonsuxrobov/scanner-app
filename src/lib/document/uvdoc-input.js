// Prepares UVDoc's input: a region of the photo resized (bilinear) to
// 488 × 712, as RGB floats in [0, 1], laid out as a 1×3×H×W tensor.
export const UVDOC_WIDTH = 488;
export const UVDOC_HEIGHT = 712;

// region: { x, y, w, h } in pixels of the RGBA image (width × height).
export function uvdocInput(data, width, height, region) {
  const W = UVDOC_WIDTH, H = UVDOC_HEIGHT, plane = W * H;
  const out = new Float32Array(3 * plane);
  for (let oy = 0; oy < H; oy++) {
    // align_corners: the first and last samples land on the region's edges.
    const sy = Math.min(height - 1, Math.max(0, region.y + (oy / (H - 1)) * (region.h - 1)));
    const y0 = Math.floor(sy), y1 = Math.min(height - 1, y0 + 1), fy = sy - y0;
    for (let ox = 0; ox < W; ox++) {
      const sx = Math.min(width - 1, Math.max(0, region.x + (ox / (W - 1)) * (region.w - 1)));
      const x0 = Math.floor(sx), x1 = Math.min(width - 1, x0 + 1), fx = sx - x0;
      const a = (y0 * width + x0) * 4, b = (y0 * width + x1) * 4, c = (y1 * width + x0) * 4, d = (y1 * width + x1) * 4;
      const o = oy * W + ox;
      for (let ch = 0; ch < 3; ch++) {
        const top = data[a + ch] * (1 - fx) + data[b + ch] * fx;
        const bottom = data[c + ch] * (1 - fx) + data[d + ch] * fx;
        out[ch * plane + o] = (top * (1 - fy) + bottom * fy) / 255;
      }
    }
  }
  return out;
}
