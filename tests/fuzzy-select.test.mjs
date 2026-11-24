// Contiguous color selection ("fuzzy select") and the region a bucket fill
// covers: a global color match, kept only where it touches the clicked pixel.
import test from "node:test";
import assert from "node:assert/strict";
import { colorDistances, distancesToMask } from "../src/editor/engine/selection/color-match.js";
import { connectedRegion } from "../src/editor/engine/selection/connected-region.js";
import { combineMasks, shapeMask } from "../src/editor/engine/selection/mask.js";

// 12×6 image: white page, a dark line down column 6, slightly grey patch on the right.
const W = 12, H = 6;
const color = (x, y) => (x === 6 ? [20, 20, 20, 255] : x > 8 && y < 3 ? [240, 240, 240, 255] : [255, 255, 255, 255]);
const data = Uint8ClampedArray.from(Array.from({ length: W * H }, (_, i) => color(i % W, Math.floor(i / W))).flat());
const region = (x, y, threshold) => {
  const p = (y * W + x) * 4;
  const mask = distancesToMask(colorDistances(data, data.slice(p, p + 4), { transparent: true }), threshold, false);
  return { all: mask, touching: connectedRegion(mask, W, H, x, y) };
};
const count = (mask) => mask.reduce((n, v) => n + (v ? 1 : 0), 0);

test("without 'contiguous' the match is global; with it the dark line stops it", () => {
  const { all, touching } = region(1, 1, 20);
  assert.equal(count(all), W * H - H); // everything but the line
  assert.equal(count(touching), 6 * H); // only the left side of the line
  assert.equal(touching[2 * W + 8], 0);
});

test("the threshold decides whether a slightly different patch joins in", () => {
  assert.equal(count(region(11, 5, 5).touching), 5 * H - 9); // right side without the grey patch
  assert.equal(count(region(11, 5, 20).touching), 5 * H); // with it
});

test("a selection limits a bucket fill to its inside", () => {
  const selection = shapeMask(W, H, { x: 0, y: 0, w: 3, h: 2 });
  const fill = combineMasks(selection, region(1, 1, 20).touching, "intersect");
  assert.equal(count(fill), 6);
  const outside = combineMasks(selection, region(11, 5, 20).touching, "intersect");
  assert.equal(count(outside), 0); // clicked beyond the selection: nothing to fill
});
