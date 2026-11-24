import test from "node:test";
import assert from "node:assert/strict";
import { gaussianBlur } from "../src/editor/engine/adjust/gaussian-blur.js";

const image = (w, h, pixel) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(pixel(i % w, Math.floor(i / w)), i * 4);
  return data;
};

test("blurring an opaque layer keeps its borders opaque", () => {
  const w = 40, h = 30;
  const data = gaussianBlur(image(w, h, (x) => [x < 20 ? 0 : 255, 128, 64, 255]), w, h, 8);
  for (let i = 0; i < w * h; i++) assert.equal(data[i * 4 + 3], 255, `alpha at pixel ${i}`);
});

test("a flat color is unchanged, edges included", () => {
  const w = 16, h = 16;
  const data = gaussianBlur(image(w, h, () => [200, 100, 50, 255]), w, h, 5);
  for (let i = 0; i < w * h; i++) assert.deepEqual([...data.slice(i * 4, i * 4 + 4)], [200, 100, 50, 255]);
});

test("the interior is still blurred", () => {
  const w = 40, h = 8;
  const data = gaussianBlur(image(w, h, (x) => [x < 20 ? 0 : 255, 0, 0, 255]), w, h, 4);
  const red = (x) => data[(4 * w + x) * 4];
  assert.ok(red(19) > 60 && red(19) < 128 && red(20) > 127 && red(20) < 195, "the hard edge became a ramp");
  assert.ok(red(0) < 3 && red(39) > 252, "far from the edge nothing changes");
});

test("transparent surroundings inside the layer still fade, without darkening", () => {
  const w = 21, h = 21;
  const data = gaussianBlur(image(w, h, (x, y) => (x > 6 && x < 14 && y > 6 && y < 14 ? [255, 255, 255, 255] : [0, 0, 0, 0])), w, h, 2);
  const at = (x, y) => [...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)];
  const [r, , , a] = at(6, 10); // just outside the white square
  assert.ok(a > 20 && a < 235, "soft edge");
  assert.ok(r > 250, "color stays white, not grey");
  assert.equal(at(0, 0)[3], 0);
});
