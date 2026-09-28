import test from "node:test";
import assert from "node:assert/strict";
import { fillGaps } from "../src/lib/document/fill-gaps.js";
import { cleanDocument } from "../src/lib/document/clean-document.js";
import { clearBorder } from "../src/lib/document/clear-border.js";

test("gaps take the value of the known cells around them", () => {
  // 20×20 map: left half 100, right half 200, a 6×6 gap in the middle.
  const w = 20, h = 20;
  const values = new Float32Array(w * h), known = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      values[y * w + x] = x < 10 ? 100 : 200;
      known[y * w + x] = x >= 7 && x < 13 && y >= 7 && y < 13 ? 0 : 1;
      if (!known[y * w + x]) values[y * w + x] = 0;
    }
  const out = fillGaps(values, known, w, h, 1);
  assert.equal(out[0], 100); // known cells keep their value
  assert.ok(out[10 * w + 7] < out[10 * w + 12], "the gap follows its neighbours");
  for (let y = 7; y < 13; y++) for (let x = 7; x < 13; x++) assert.ok(out[y * w + x] > 99.9 && out[y * w + x] < 200.1);
});

test("a map with nothing known is left alone", () => {
  const out = fillGaps(new Float32Array([1, 2, 3]), new Uint8Array(3), 3, 1, 1);
  assert.deepEqual([...out], [1, 2, 3]);
});

test("a large dark picture stays dark and even; the paper around it turns white", () => {
  // Paper (200) with a dark picture (50) covering the middle third.
  const w = 600, h = 800;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0, p = 0; y < h; y++)
    for (let x = 0; x < w; x++, p += 4) {
      const inside = x >= 100 && x < 500 && y >= 250 && y < 550;
      data[p] = data[p + 1] = data[p + 2] = inside ? 50 : 200;
      data[p + 3] = 255;
    }
  cleanDocument(data, w, h);
  const at = (x, y) => data[(y * w + x) * 4];
  assert.equal(at(20, 20), 255);
  const picture = [];
  for (let y = 270; y < 530; y += 20) for (let x = 120; x < 480; x += 20) picture.push(at(x, y));
  assert.ok(Math.max(...picture) < 40, `picture lifted to ${Math.max(...picture)}`);
  assert.ok(Math.max(...picture) - Math.min(...picture) < 10, "picture is even");
});

function page(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0, p = 0; y < h; y++)
    for (let x = 0; x < w; x++, p += 4) {
      const c = paint(x, y);
      if (c) [data[p], data[p + 1], data[p + 2]] = c;
    }
  return data;
}

test("slivers of desk along the page's edge are whitened", () => {
  const wood = [150, 90, 40];
  // A wedge along the bottom, 12 px deep at the left tapering to 0 (band is 16 px).
  const data = page(300, 400, (x, y) => (y >= 400 - 12 * (1 - x / 300) ? wood : null));
  clearBorder(data, 300, 400);
  assert.equal(data[(399 * 300 + 2) * 4], 255);
});

test("content reaching past the edge band is kept", () => {
  // A picture printed to the left edge, 100 px wide; a text line inside the page.
  const data = page(300, 400, (x, y) => (x < 100 && y > 100 && y < 200 ? [20, 20, 20] : x > 150 && x < 200 && y === 300 ? [0, 0, 0] : null));
  clearBorder(data, 300, 400);
  assert.equal(data[(150 * 300 + 0) * 4], 20);
  assert.equal(data[(300 * 300 + 160) * 4], 0);
});
