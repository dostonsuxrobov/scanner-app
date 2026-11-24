import test from "node:test";
import assert from "node:assert/strict";
import { growMask, shrinkMask } from "../src/editor/engine/selection/grow-mask.js";
import { shapeMask } from "../src/editor/engine/selection/mask.js";
import { maskBounds } from "../src/editor/engine/selection/mask-bounds.js";

const W = 40, H = 30;
const rect = (x, y, w, h) => shapeMask(W, H, { x, y, w, h });
const box = (mask) => { const { x, y, w, h, count } = maskBounds(mask, W, H); return { x, y, w, h, count }; };

// Brute force: the highest value within r in both directions.
function slowGrow(mask, r) {
  const out = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++)
      for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) best = Math.max(best, mask[yy * W + xx]);
    out[y * W + x] = best;
  }
  return out;
}

test("growing widens a rectangle by the radius on every side", () => {
  assert.deepEqual(box(growMask(rect(10, 8, 12, 6), W, H, 3)), { x: 7, y: 5, w: 18, h: 12, count: 18 * 12 });
});

test("shrinking narrows it, and undoes a grow", () => {
  const start = rect(10, 8, 12, 6);
  assert.deepEqual(box(shrinkMask(start, W, H, 2)), { x: 12, y: 10, w: 8, h: 2, count: 16 });
  assert.deepEqual([...shrinkMask(growMask(start, W, H, 4), W, H, 4)], [...start]);
});

test("growing stops at the image edge; shrinking does not pull away from it", () => {
  assert.deepEqual(box(growMask(rect(0, 0, 5, 5), W, H, 50)), { x: 0, y: 0, w: W, h: H, count: W * H });
  assert.deepEqual(box(shrinkMask(rect(0, 0, 10, 10), W, H, 3)), { x: 0, y: 0, w: 7, h: 7, count: 49 });
});

test("shrinking by more than half the size leaves nothing", () => {
  assert.equal(box(shrinkMask(rect(10, 8, 12, 6), W, H, 3)).count, 0);
});

test("matches a brute-force maximum, soft edges and all", () => {
  let seed = 11;
  const noise = Uint8ClampedArray.from({ length: W * H }, () => ((seed = (seed * 1103515245 + 12345) % 2147483648) % 97 === 0 ? seed % 256 : 0));
  for (const r of [1, 2, 5, 13, 60]) assert.deepEqual([...growMask(noise, W, H, r)], [...slowGrow(noise, r)], `radius ${r}`);
  const soft = shapeMask(W, H, { x: 5.5, y: 4.25, w: 20.5, h: 11.5 }, { kind: "ellipse" });
  assert.deepEqual([...growMask(soft, W, H, 2)], [...slowGrow(soft, 2)]);
});

test("a zero radius changes nothing", () => {
  const start = rect(3, 3, 4, 4);
  assert.equal(growMask(start, W, H, 0), start);
});
