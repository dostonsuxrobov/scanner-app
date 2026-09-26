import test from "node:test";
import assert from "node:assert/strict";
import { adjustColors, desaturate, invertColors, NEUTRAL_ADJUSTMENT } from "../src/editor/engine/adjust/color-adjust.js";
import { gaussianBlur } from "../src/editor/engine/adjust/gaussian-blur.js";

test("neutral adjustment leaves pixels unchanged", () => {
  const data = new Uint8ClampedArray([10, 128, 250, 255]);
  assert.deepEqual([...adjustColors(data, NEUTRAL_ADJUSTMENT)], [10, 128, 250, 255]);
});

test("brightness 200% doubles and clamps", () => {
  const data = new Uint8ClampedArray([50, 200, 0, 255]);
  assert.deepEqual([...adjustColors(data, { ...NEUTRAL_ADJUSTMENT, brightness: 200 })], [100, 255, 0, 255]);
});

test("zero saturation produces gray", () => {
  const [r, g, b] = adjustColors(new Uint8ClampedArray([255, 0, 0, 255]), { ...NEUTRAL_ADJUSTMENT, saturation: 0 });
  assert.ok(r === g && g === b);
});

test("desaturate and invert", () => {
  const gray = desaturate(new Uint8ClampedArray([255, 255, 255, 255]));
  assert.deepEqual([...gray], [255, 255, 255, 255]);
  assert.deepEqual([...invertColors(new Uint8ClampedArray([0, 100, 255, 7]))], [255, 155, 0, 7]);
});

test("blur spreads a single pixel and preserves total alpha", () => {
  const w = 21, data = new Uint8ClampedArray(w * w * 4);
  const centre = (10 * w + 10) * 4;
  data.set([255, 0, 0, 255], centre);
  gaussianBlur(data, w, w, 2);
  assert.ok(data[centre + 3] < 255 && data[centre + 3 + 4] > 0);
  let total = 0;
  for (let p = 3; p < data.length; p += 4) total += data[p];
  assert.ok(Math.abs(total - 255) < 20);
  assert.equal(data[centre], 255); // colour survives at partial alpha
});
