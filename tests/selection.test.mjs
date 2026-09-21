import test from "node:test";
import assert from "node:assert/strict";
import {
  selectColor,
  combineMasks,
  translateMask,
  selectionFromMask,
} from "../src/lib/editor/selection.js";

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
test("empty selection remains distinct from no selection", () => {
  const selection = selectionFromMask(new Uint8ClampedArray(12), 4, 3);
  assert.equal(selection.count, 0);
  assert.equal(selection.w, 0);
  assert.ok(selection.mask);
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
