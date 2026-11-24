// Threshold and auto contrast.
import test from "node:test";
import assert from "node:assert/strict";
import { threshold } from "../src/editor/engine/adjust/color-adjust.js";
import { levelRange, stretchContrast } from "../src/editor/engine/adjust/stretch-contrast.js";
import { maskWindow } from "../src/editor/engine/selection/mask.js";

const pixels = (...list) => Uint8ClampedArray.from(list.flat());
const grey = (values, alpha = 255) => Uint8ClampedArray.from(values.flatMap((v) => [v, v, v, alpha]));

test("threshold makes pixels black or white by brightness and keeps alpha", () => {
  const data = threshold(pixels([127, 127, 127, 255], [128, 128, 128, 200], [255, 0, 0, 255], [0, 255, 0, 10]), 128);
  assert.deepEqual([...data], [0, 0, 0, 255, 255, 255, 255, 200, 0, 0, 0, 255, 255, 255, 255, 10]);
  assert.deepEqual([...threshold(grey([0, 50, 200]), 0)].filter((_, i) => i % 4 === 0), [255, 255, 255]);
  assert.deepEqual([...threshold(grey([0, 50, 200]), 201)].filter((_, i) => i % 4 === 0), [0, 0, 0]);
});

test("auto contrast stretches the measured range to black…white", () => {
  const data = stretchContrast(grey([60, 80, 110, 160]));
  assert.deepEqual([...data].filter((_, i) => i % 4 === 0), [0, 51, 128, 255]);
});

test("colors share one range, so a tinted pixel keeps its hue", () => {
  const data = stretchContrast(pixels([50, 50, 50, 255], [150, 150, 150, 255], [120, 100, 80, 255]));
  const [r, g, b] = data.slice(8, 11);
  assert.deepEqual([r, g, b], [179, 128, 77]); // (v − 50) · 255 / 100
});

test("a few stray dark or light pixels do not hold the range back", () => {
  const values = [0, 255, ...Array.from({ length: 998 }, (_, i) => 100 + (i % 51))]; // dust + a 100…150 page
  assert.deepEqual(levelRange(grey(values)), { low: 100, high: 150 });
});

test("only the selected, visible pixels are measured", () => {
  const data = grey([10, 240, 100, 140]);
  assert.deepEqual(levelRange(data, Uint8Array.of(0, 0, 255, 255)), { low: 100, high: 140 });
  const transparent = pixels([0, 0, 0, 0], [90, 90, 90, 255], [130, 130, 130, 255]);
  assert.deepEqual(levelRange(transparent), { low: 90, high: 130 });
});

test("a flat or empty area is left alone", () => {
  assert.deepEqual([...stretchContrast(grey([77, 77, 77]))], [...grey([77, 77, 77])]);
  assert.deepEqual([...stretchContrast(grey([10, 200], 0))], [...grey([10, 200], 0)]);
});

test("the selection as a layer sees it: offset and clipped to the image", () => {
  // 4×3 image mask, numbered 1…12.
  const mask = Uint8ClampedArray.from({ length: 12 }, (_, i) => i + 1);
  assert.deepEqual([...maskWindow(mask, 4, 3, 1, 1, 2, 2)], [6, 7, 10, 11]);
  // A 3×3 layer at (-1, -1): its first row and column lie outside the image.
  assert.deepEqual([...maskWindow(mask, 4, 3, -1, -1, 3, 3)], [0, 0, 0, 0, 1, 2, 0, 5, 6]);
  assert.deepEqual([...maskWindow(mask, 4, 3, 3, 2, 2, 2)], [12, 0, 0, 0]);
  assert.deepEqual([...maskWindow(mask, 4, 3, 9, 9, 2, 1)], [0, 0]);
});
