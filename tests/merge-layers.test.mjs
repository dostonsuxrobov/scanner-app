import test from "node:test";
import assert from "node:assert/strict";
import { mergedBounds } from "../src/editor/engine/merge-layers.js";

const layer = (x, y, width, height) => ({ x, y, canvas: { width, height } });

test("a merged layer covers both layers, including parts outside the image", () => {
  // An 800×600 image: the background fills it, the top layer hangs off the left and bottom.
  assert.deepEqual(mergedBounds(layer(0, 0, 800, 600), layer(-200, 450, 500, 400)), { x: -200, y: 0, w: 1000, h: 850 });
});

test("two small layers merge into a small layer, not an image-sized one", () => {
  assert.deepEqual(mergedBounds(layer(100, 100, 50, 40), layer(120, 90, 60, 20)), { x: 100, y: 90, w: 80, h: 50 });
});
