// Flattens a page by resampling the photo through a page grid: each output
// pixel's position on the page is looked up in the (bilinearly upsampled)
// grid, and the photo is sampled there (bilinear).
import { GRID_COLS, GRID_ROWS, gridPoint } from "./uvdoc-grid.js";

export function unwarpWithGrid(data, width, height, points, outW, outH) {
  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let oy = 0; oy < outH; oy++) {
    const gv = (oy / Math.max(1, outH - 1)) * (GRID_ROWS - 1);
    const r0 = Math.min(GRID_ROWS - 2, Math.floor(gv)), fr = gv - r0;
    for (let ox = 0; ox < outW; ox++) {
      const gu = (ox / Math.max(1, outW - 1)) * (GRID_COLS - 1);
      const c0 = Math.min(GRID_COLS - 2, Math.floor(gu)), fc = gu - c0;
      const p00 = gridPoint(points, r0, c0), p01 = gridPoint(points, r0, c0 + 1);
      const p10 = gridPoint(points, r0 + 1, c0), p11 = gridPoint(points, r0 + 1, c0 + 1);
      const sx = (p00.x * (1 - fc) + p01.x * fc) * (1 - fr) + (p10.x * (1 - fc) + p11.x * fc) * fr;
      const sy = (p00.y * (1 - fc) + p01.y * fc) * (1 - fr) + (p10.y * (1 - fc) + p11.y * fc) * fr;
      const o = (oy * outW + ox) * 4;
      if (sx < 0 || sy < 0 || sx > width - 1 || sy > height - 1) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 255;
        continue;
      }
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;
      const a = (y0 * width + x0) * 4, b = (y0 * width + x1) * 4, c = (y1 * width + x0) * 4, d = (y1 * width + x1) * 4;
      for (let ch = 0; ch < 4; ch++)
        out[o + ch] = (data[a + ch] * (1 - fx) + data[b + ch] * fx) * (1 - fy) + (data[c + ch] * (1 - fx) + data[d + ch] * fx) * fy;
    }
  }
  return out;
}
