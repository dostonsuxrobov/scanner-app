// Whole-image quarter turns and flips: pure geometry, no resampling.
import test from "node:test";
import assert from "node:assert/strict";
import { turnMask, turnRect, turnedSize } from "../src/editor/engine/transform/turn-image.js";

const W = 5, H = 3;
// A mask whose value says where each pixel came from: 10·y + x + 1.
const mask = Uint8ClampedArray.from({ length: W * H }, (_, i) => 10 * Math.floor(i / W) + (i % W) + 1);
const rows = (m, width) => Array.from({ length: m.length / width }, (_, y) => [...m.slice(y * width, (y + 1) * width)]);

test("quarter turns swap the image's sides, flips keep them", () => {
  assert.deepEqual(turnedSize(W, H, "cw"), { width: 3, height: 5 });
  assert.deepEqual(turnedSize(W, H, "ccw"), { width: 3, height: 5 });
  for (const how of ["half", "flipH", "flipV"]) assert.deepEqual(turnedSize(W, H, how), { width: 5, height: 3 });
});

test("a clockwise turn sends the top-left pixel to the top right", () => {
  assert.deepEqual(rows(turnMask(mask, W, H, "cw"), 3), [[21, 11, 1], [22, 12, 2], [23, 13, 3], [24, 14, 4], [25, 15, 5]]);
  assert.deepEqual(rows(turnMask(mask, W, H, "ccw"), 3), [[5, 15, 25], [4, 14, 24], [3, 13, 23], [2, 12, 22], [1, 11, 21]]);
});

test("half turn and flips", () => {
  assert.deepEqual(rows(turnMask(mask, W, H, "half"), 5), [[25, 24, 23, 22, 21], [15, 14, 13, 12, 11], [5, 4, 3, 2, 1]]);
  assert.deepEqual(rows(turnMask(mask, W, H, "flipH"), 5)[0], [5, 4, 3, 2, 1]);
  assert.deepEqual(rows(turnMask(mask, W, H, "flipV"), 5).map((r) => r[0]), [21, 11, 1]);
});

test("turning back restores every pixel", () => {
  const back = { cw: "ccw", ccw: "cw", half: "half", flipH: "flipH", flipV: "flipV" };
  for (const [how, undo] of Object.entries(back)) {
    const size = turnedSize(W, H, how);
    assert.deepEqual([...turnMask(turnMask(mask, W, H, how), size.width, size.height, undo)], [...mask], how);
  }
  let m = mask, w = W, h = H;
  for (let i = 0; i < 4; i++) [m, w, h] = [turnMask(m, w, h, "cw"), h, w];
  assert.deepEqual([...m], [...mask], "four clockwise turns");
});

test("layers land where their pixels do, including ones hanging off the image", () => {
  // The single selected pixel of a mask and a 1×1 rectangle must agree.
  for (const how of ["cw", "ccw", "half", "flipH", "flipV"]) {
    const size = turnedSize(W, H, how);
    for (const [x, y] of [[0, 0], [4, 0], [2, 1], [4, 2]]) {
      const one = new Uint8ClampedArray(W * H);
      one[y * W + x] = 255;
      const at = turnMask(one, W, H, how).indexOf(255);
      const r = turnRect({ x, y, w: 1, h: 1 }, W, H, how);
      assert.deepEqual([r.x, r.y], [at % size.width, Math.floor(at / size.width)], `${how} ${x},${y}`);
    }
  }
  // An 800×600 image; a 300×100 layer at (-50, 550) hangs off the left and bottom.
  const layer = { x: -50, y: 550, w: 300, h: 100 };
  assert.deepEqual(turnRect(layer, 800, 600, "cw"), { x: -50, y: -50, w: 100, h: 300 });
  assert.deepEqual(turnRect(layer, 800, 600, "ccw"), { x: 550, y: 550, w: 100, h: 300 });
  assert.deepEqual(turnRect(layer, 800, 600, "half"), { x: 550, y: -50, w: 300, h: 100 });
  assert.deepEqual(turnRect(layer, 800, 600, "flipH"), { x: 550, y: 550, w: 300, h: 100 });
  assert.deepEqual(turnRect(layer, 800, 600, "flipV"), { x: -50, y: -50, w: 300, h: 100 });
});
