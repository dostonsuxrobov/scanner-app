// Smooth maps of the blank paper's level in each color channel, everywhere
// on a page: what the paper would look like there with nothing printed on
// it. Text is removed with a max filter. Areas that hold no blank paper
// (large dark pictures, tinted table cells, highlighted blocks) carry no
// measurement and take the paper level around them, so dividing by the map
// leaves them as they are instead of bleaching them.
import { downscale } from "./luminance.js";
import { boxBlur, maxFilter } from "./filters.js";
import { fillGaps } from "./fill-gaps.js";
import { percentile } from "./percentile.js";
import { paperColoured } from "./paper-colour.js";

const MAP_SIZE = 256;
// A neighbourhood whose brightest spot is darker than this share of the
// page's paper holds no paper, only a picture or a solid dark area.
const PAPER_SHARE = 0.45;

function channel(data, width, height, c) {
  const out = new Float32Array(width * height);
  for (let i = 0, p = c; i < out.length; i++, p += 4) out[i] = data[p];
  return out;
}

// Returns three maps ({ gray, width, height, scale }), for R, G and B.
export function paperMaps(data, width, height) {
  const brightest = [0, 1, 2].map((c) => {
    const small = downscale(channel(data, width, height, c), width, height, MAP_SIZE);
    const radius = Math.max(2, Math.round(Math.max(small.width, small.height) * 0.025));
    return { ...small, radius, gray: maxFilter(small.gray, small.width, small.height, radius) };
  });
  const [r, g, b] = brightest.map((m) => m.gray);
  const { width: w, height: h, radius } = brightest[0];
  const lum = r.map((v, i) => 0.299 * v + 0.587 * g[i] + 0.114 * b[i]);
  const paper = percentile(lum, 0.95);
  const bright = Uint8Array.from(lum, (v) => (v >= paper * PAPER_SHARE ? 1 : 0));
  const known = paperColoured(r, b, lum, bright, w, h);
  return brightest.map(({ radius: _, ...m }) => ({ ...m, gray: boxBlur(fillGaps(m.gray, known, w, h, radius), w, h, radius) }));
}
