import test from "node:test";
import assert from "node:assert/strict";
import { alphaBounds } from "../src/editor/engine/content-bounds.js";

test("bounds enclose visible pixels only", () => {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  data[(1 * 4 + 2) * 4 + 3] = 255;
  data[(2 * 4 + 1) * 4 + 3] = 1;
  assert.deepEqual(alphaBounds(data, 4, 4), { x: 1, y: 1, w: 2, h: 2 });
});

test("a fully transparent canvas has no bounds", () => {
  assert.equal(alphaBounds(new Uint8ClampedArray(16), 2, 2), null);
});
