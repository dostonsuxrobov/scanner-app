// Finds the four corners of a paper document in a photo.
//
// Lighting varies smoothly across a page but its outline is an abrupt change,
// so regions are grown through pixels with a small brightness gradient (the
// page's outline acts as a wall, and shadows don't). Regions from a plain
// brightness split (Otsu) are added for evenly lit photos. Each region's holes
// (text, pictures) are filled, a quadrilateral is fitted, and the most
// page-like fit wins: it fills its quadrilateral, is large, and doesn't run
// along the photo's border like the desk around it does.
import { luminance, downscale } from "./luminance.js";
import { boxBlur } from "./filters.js";
import { gradientMagnitude } from "./gradient.js";
import { otsuThreshold } from "./otsu.js";
import { borderContact, dilate, fillHoles, labelRegions, regionMask } from "./regions.js";
import { convexHull, maxAreaQuad, polygonArea, regionBoundary } from "./quad-fit.js";

const WORK_SIZE = 480;
const GRADIENT_WALLS = [3, 6, 12];
const MIN_COVERAGE = 0.12;
const MAX_COVERAGE = 0.985;

function evaluate(region, w, h, grow = 0) {
  let page = fillHoles(region, w, h);
  if (grow) page = dilate(page, w, h, grow);
  let count = 0;
  for (const v of page) count += v;
  const contact = borderContact(page, w, h);
  if (count < w * h * MIN_COVERAGE || contact > 0.35) return null;
  const quad = maxAreaQuad(convexHull(regionBoundary(page, w, h)));
  if (!quad) return null;
  const area = polygonArea(quad);
  const coverage = area / (w * h);
  const fill = Math.min(1, count / area);
  if (coverage > MAX_COVERAGE || fill < 0.88) return null;
  return { quad, score: fill ** 4 * Math.sqrt(coverage) * (1 - contact) };
}

function candidates(gray, w, h) {
  const found = [];
  const minSize = w * h * MIN_COVERAGE * 0.5;
  // Smooth regions bounded by strong edges.
  const grad = gradientMagnitude(gray, w, h);
  for (const wall of GRADIENT_WALLS) {
    const smooth = new Uint8Array(grad.length);
    for (let i = 0; i < grad.length; i++) smooth[i] = grad[i] < wall ? 1 : 0;
    const { labels, sizes } = labelRegions(smooth, w, h);
    sizes.forEach((size, label) => {
      if (label && size >= minSize) found.push(evaluate(regionMask(labels, label), w, h, 2));
    });
  }
  // Bright or dark regions from a global split.
  const t = otsuThreshold(gray);
  for (const bright of [true, false]) {
    const mask = new Uint8Array(gray.length);
    for (let i = 0; i < gray.length; i++) mask[i] = (gray[i] > t) === bright ? 1 : 0;
    const { labels, sizes } = labelRegions(mask, w, h);
    const largest = sizes.indexOf(Math.max(...sizes.slice(1)));
    if (largest > 0) found.push(evaluate(regionMask(labels, largest), w, h));
  }
  return found.filter(Boolean);
}

// Returns { found, corners } with corners (TL, TR, BR, BL) in original pixels.
export function detectDocument(data, width, height) {
  const small = downscale(luminance(data, width, height), width, height, WORK_SIZE);
  const gray = boxBlur(small.gray, small.width, small.height, 1);
  const best = candidates(gray, small.width, small.height).sort((a, b) => b.score - a.score)[0];
  if (!best) return { found: false, corners: null };
  const inv = 1 / small.scale;
  return { found: true, corners: best.quad.map((p) => ({ x: p.x * inv, y: p.y * inv })) };
}
