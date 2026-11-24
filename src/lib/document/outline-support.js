// How much of a candidate page outline sits on a real edge in the photo.
//
// A page's outline separates paper from whatever is behind it, so brightness
// just inside the outline differs from brightness just outside, and in the
// same direction all along a side. An outline drawn across plain paper, a
// desk, or lines of text does not have that. The share of the outline with
// such an edge is its support (0–1).
import { luminance, downscale } from "./luminance.js";
import { boxBlur } from "./filters.js";

const WORK_SIZE = 640;
// Distance (share of the map's size) at which the two sides are compared: far
// enough to step over a blurry or slightly misplaced edge.
const REACH = 0.012;
// Brightness difference (gray levels) that counts as an edge.
const CONTRAST = 14;
const STEP = 2; // px between samples along the outline
// With less of the outline than this inside the photo there is no evidence.
const MIN_VISIBLE = 0.2;

// A small, lightly blurred brightness map of the photo to measure outlines on.
export function edgeMap(data, width, height) {
  const small = downscale(luminance(data, width, height), width, height, WORK_SIZE);
  return { ...small, gray: boxBlur(small.gray, small.width, small.height, 1) };
}

// sides: polylines ([{ x, y }] in photo pixels) that together run clockwise
// around the page, so the page is on the right of each one.
export function outlineSupport(map, sides) {
  const { gray, width, height, scale } = map;
  const reach = Math.max(width, height) * REACH;
  const at = (x, y) => (x < 1 || y < 1 || x >= width - 1 || y >= height - 1 ? null : gray[Math.round(y) * width + Math.round(x)]);
  let supported = 0, visible = 0, total = 0;
  for (const side of sides) {
    let brighter = 0, darker = 0; // the page is brighter / darker than outside
    for (let i = 1; i < side.length; i++) {
      const ax = side[i - 1].x * scale, ay = side[i - 1].y * scale;
      const dx = side[i].x * scale - ax, dy = side[i].y * scale - ay;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) continue;
      const nx = (-dy / length) * reach, ny = (dx / length) * reach; // towards the page
      for (let t = STEP / 2; t < length; t += STEP) {
        const x = ax + (dx * t) / length, y = ay + (dy * t) / length;
        const inside = at(x + nx, y + ny), outside = at(x - nx, y - ny);
        total++;
        if (inside == null || outside == null) continue;
        visible++;
        if (inside - outside > CONTRAST) brighter++;
        else if (outside - inside > CONTRAST) darker++;
      }
    }
    supported += Math.max(brighter, darker);
  }
  return total && visible >= total * MIN_VISIBLE ? supported / visible : 0;
}

// The four sides of a quadrilateral (TL, TR, BR, BL).
export const quadSides = (corners) => corners.map((p, i) => [p, corners[(i + 1) % 4]]);
