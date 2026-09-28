// Makes a photographed page look scanned, in place on RGBA data:
// 1. Lighting and white balance: each color channel's paper level is
//    estimated everywhere (text removed with a max filter, then smoothed)
//    and divided out, so shadows, uneven light, and warm or cool casts become
//    neutral white paper while ink and stamps keep their color. Areas with
//    no paper in reach (large dark pictures) take the paper level around
//    them, so they stay dark instead of being lifted into grey blotches.
// 2. Contrast: the darkest ink is stretched towards black; anything close to
//    paper white becomes pure white, which also hides amplified grain.
// 3. Sharpness: a light unsharp mask crisps text edges (not blank paper).
import { luminance, downscale } from "./luminance.js";
import { boxBlur, maxFilter } from "./filters.js";
import { fillGaps } from "./fill-gaps.js";

const LIGHT_MAP_SIZE = 256;
// A neighbourhood whose brightest spot is darker than this share of the
// page's paper holds no paper, only a picture or a solid dark area.
const PAPER_SHARE = 0.45;
const PAPER_WHITE = 222; // flattened brightness treated as blank paper
const INK_GAMMA = 1.2;
const SHARPEN = 0.6;
const SHARPEN_BELOW = 215; // only sharpen where there is ink nearby

function channel(data, width, height, c) {
  const out = new Float32Array(width * height);
  for (let i = 0, p = c; i < out.length; i++, p += 4) out[i] = data[p];
  return out;
}

// Smooth maps of the paper's level in each color channel.
function paperMaps(data, width, height) {
  const brightest = [0, 1, 2].map((c) => {
    const small = downscale(channel(data, width, height, c), width, height, LIGHT_MAP_SIZE);
    const radius = Math.max(2, Math.round(Math.max(small.width, small.height) * 0.025));
    return { ...small, radius, gray: maxFilter(small.gray, small.width, small.height, radius) };
  });
  const [r, g, b] = brightest.map((m) => m.gray);
  const lum = r.map((v, i) => 0.299 * v + 0.587 * g[i] + 0.114 * b[i]);
  const paper = percentile(lum, 0.95);
  const known = lum.map((v) => (v >= paper * PAPER_SHARE ? 1 : 0));
  return brightest.map(({ radius, ...m }) => ({
    ...m,
    gray: boxBlur(fillGaps(m.gray, known, m.width, m.height, radius), m.width, m.height, radius),
  }));
}

// Bilinear lookup of a map at full-resolution pixel (x, y).
function sample(map, x, y) {
  const fx = Math.min(map.width - 1, Math.max(0, (x + 0.5) * map.scale - 0.5));
  const fy = Math.min(map.height - 1, Math.max(0, (y + 0.5) * map.scale - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(map.width - 1, x0 + 1), y1 = Math.min(map.height - 1, y0 + 1);
  const ax = fx - x0, ay = fy - y0;
  const g = map.gray, w = map.width;
  return (g[y0 * w + x0] * (1 - ax) + g[y0 * w + x1] * ax) * (1 - ay) + (g[y1 * w + x0] * (1 - ax) + g[y1 * w + x1] * ax) * ay;
}

function percentile(values, fraction) {
  const hist = new Uint32Array(256);
  for (const v of values) hist[Math.max(0, Math.min(255, v | 0))]++;
  let seen = 0;
  const target = values.length * fraction;
  for (let t = 0; t < 256; t++) if ((seen += hist[t]) >= target) return t;
  return 255;
}

export function cleanDocument(data, width, height) {
  // 1. Flatten lighting per channel (this also white-balances the paper).
  const maps = paperMaps(data, width, height);
  for (let y = 0, p = 0; y < height; y++)
    for (let x = 0; x < width; x++, p += 4)
      for (let c = 0; c < 3; c++) data[p + c] *= 255 / Math.max(40, sample(maps[c], x, y));
  // 2. Levels: the darkest 1% → black, paper → white, a little gamma for ink.
  const lum = luminance(data, width, height);
  const black = Math.min(110, percentile(lum, 0.01));
  const range = Math.max(40, PAPER_WHITE - black);
  const curve = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) curve[v] = 255 * Math.pow(Math.max(0, Math.min(1, (v - black) / range)), INK_GAMMA);
  for (let p = 0; p < data.length; p += 4) {
    data[p] = curve[data[p]];
    data[p + 1] = curve[data[p + 1]];
    data[p + 2] = curve[data[p + 2]];
  }
  // 3. Sharpen text edges on luminance so colors don't fringe.
  const sharp = luminance(data, width, height);
  const soft = boxBlur(sharp, width, height, 1);
  for (let i = 0, p = 0; i < sharp.length; i++, p += 4) {
    if (soft[i] > SHARPEN_BELOW) continue;
    const d = (sharp[i] - soft[i]) * SHARPEN;
    data[p] += d;
    data[p + 1] += d;
    data[p + 2] += d;
  }
  return data;
}
