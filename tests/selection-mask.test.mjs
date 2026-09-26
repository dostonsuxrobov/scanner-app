import test from "node:test";
import assert from "node:assert/strict";
import { combineMasks, translateMask, shapeMask, featherMask, invertMask } from "../src/editor/engine/selection/mask.js";
import { selectColor, colorDistances, distancesToMask } from "../src/editor/engine/selection/color-match.js";
import { maskBounds } from "../src/editor/engine/selection/mask-bounds.js";
import { maskOutline } from "../src/editor/engine/selection/outline.js";

test("color selection includes disconnected matches but not a different color", () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255,
  ]);
  assert.deepEqual(
    [...selectColor(pixels, [255, 0, 0, 255], { threshold: 0 })],
    [255, 0, 255],
  );
});
test("threshold zero is exact and increasing tolerance includes near colors", () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255, 245, 245, 245, 255,
  ]);
  assert.deepEqual(
    [...selectColor(pixels, [255, 255, 255, 255], { threshold: 0 })],
    [255, 0],
  );
  assert.deepEqual(
    [...selectColor(pixels, [255, 255, 255, 255], { threshold: 10 })],
    [255, 255],
  );
});
test("transparent pixels are excluded when sampling an opaque color", () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
  assert.deepEqual(
    [
      ...selectColor(pixels, [0, 0, 0, 255], {
        threshold: 0,
        transparent: true,
      }),
    ],
    [0, 255],
  );
});
test("transparent sampling compares alpha, ignoring hidden RGB", () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 255,
  ]);
  assert.deepEqual(
    [...selectColor(pixels, [0, 0, 0, 0], { threshold: 0, transparent: true })],
    [255, 255, 0],
  );
});
test("selection arithmetic retains partial coverage", () => {
  const a = new Uint8ClampedArray([255, 0, 128]),
    b = new Uint8ClampedArray([128, 255, 64]);
  assert.deepEqual([...combineMasks(a, b, "add")], [255, 255, 128]);
  assert.deepEqual([...combineMasks(a, b, "subtract")], [127, 0, 64]);
  assert.deepEqual([...combineMasks(a, b, "intersect")], [128, 0, 64]);
});
test("translation clips without wrapping a row", () => {
  assert.deepEqual(
    [
      ...translateMask(
        new Uint8ClampedArray([255, 0, 255, 0, 0, 0]),
        3,
        2,
        1,
        0,
      ),
    ],
    [0, 255, 0, 0, 0, 0],
  );
});
test("empty mask has zero bounds and count", () => {
  const bounds = maskBounds(new Uint8ClampedArray(12), 4, 3);
  assert.equal(bounds.count, 0);
  assert.equal(bounds.w, 0);
});
test("soft boundary produces partial mask coverage", () => {
  const mask = selectColor(
    new Uint8ClampedArray([12, 12, 12, 255]),
    [0, 0, 0, 255],
    { threshold: 10, antialias: true },
  );
  assert.ok(mask[0] > 0 && mask[0] < 255);
});

test("subtract and intersect start empty when no selection exists", () => {
  const mask = new Uint8ClampedArray([255, 128]);
  assert.deepEqual([...combineMasks(null, mask, "subtract")], [0, 0]);
  assert.deepEqual([...combineMasks(null, mask, "intersect")], [0, 0]);
  assert.deepEqual([...combineMasks(null, mask, "add")], [255, 128]);
});

test("bounds cover every selected pixel", () => {
  const mask = new Uint8ClampedArray(20);
  mask[6] = 255; // (1,1) in a 5x4 mask
  mask[13] = 10; // (3,2)
  assert.deepEqual(maskBounds(mask, 5, 4), { x: 1, y: 1, w: 3, h: 2, count: 2 });
});

test("threshold changes re-map distances without resampling", () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 40, 40, 40, 255, 200, 0, 0, 0]);
  const distances = colorDistances(pixels, [0, 0, 0, 255]);
  assert.deepEqual([...distancesToMask(distances, 0, false)], [255, 0, 0]);
  assert.deepEqual([...distancesToMask(distances, 40, false)], [255, 255, 0]);
});

test("integer rectangle masks are fully opaque inside and empty outside", () => {
  const mask = shapeMask(4, 3, { x: 1, y: 1, w: 2, h: 2 });
  assert.deepEqual([...mask], [0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0]);
});

test("fractional rectangle edges are antialiased", () => {
  const mask = shapeMask(3, 1, { x: 0.5, y: 0, w: 2, h: 1 });
  assert.deepEqual([...mask], [128, 255, 128]);
});

test("ellipse masks leave corners unselected", () => {
  const mask = shapeMask(10, 10, { x: 0, y: 0, w: 10, h: 10 }, { kind: "ellipse" });
  assert.equal(mask[0], 0);
  assert.equal(mask[5 * 10 + 5], 255);
});

test("feathering softens the edge but keeps the centre selected", () => {
  const mask = shapeMask(40, 40, { x: 10, y: 10, w: 20, h: 20 });
  const soft = featherMask(mask, 40, 40, 4);
  assert.equal(soft[20 * 40 + 20], 255);
  const edge = soft[20 * 40 + 10];
  assert.ok(edge > 0 && edge < 255);
});

test("invert flips coverage", () => {
  assert.deepEqual([...invertMask(new Uint8ClampedArray([0, 255, 100]))], [255, 0, 155]);
});

test("outline of a single pixel is its four sides", () => {
  const mask = new Uint8ClampedArray(9);
  mask[4] = 255;
  const segments = maskOutline(mask, 3, 3, maskBounds(mask, 3, 3));
  assert.deepEqual([...segments], [1, 1, 2, 1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1, 2, 2]);
});

test("outline merges straight runs into single segments", () => {
  const mask = new Uint8ClampedArray(16).fill(255);
  const segments = maskOutline(mask, 4, 4, maskBounds(mask, 4, 4));
  assert.equal(segments.length / 4, 4);
});
