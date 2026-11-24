// Geometry of Scale Image and Canvas Size.
import test from "node:test";
import assert from "node:assert/strict";
import { scaledRect, scaleDocument } from "../src/editor/engine/scale-document.js";
import { canvasSizeRect, cropDocument } from "../src/editor/engine/crop-document.js";

test("scaling keeps layers aligned: edges are rounded, not sizes", () => {
  // Two layers that meet at x = 333 in a 1000-wide image, scaled to 400 (×0.4).
  const left = scaledRect({ x: 0, y: 0, w: 333, h: 100 }, 0.4, 0.4);
  const right = scaledRect({ x: 333, y: 0, w: 667, h: 100 }, 0.4, 0.4);
  assert.deepEqual(left, { x: 0, y: 0, w: 133, h: 40 });
  assert.deepEqual(right, { x: 133, y: 0, w: 267, h: 40 });
  assert.equal(left.x + left.w, right.x);
  assert.equal(right.x + right.w, 400);
});

test("scaling handles offsets outside the image and unequal factors", () => {
  assert.deepEqual(scaledRect({ x: -50, y: 20, w: 100, h: 60 }, 2, 0.5), { x: -100, y: 10, w: 200, h: 30 });
});

test("a layer never shrinks below one pixel", () => {
  assert.deepEqual(scaledRect({ x: 10, y: 10, w: 3, h: 3 }, 0.01, 0.01), { x: 0, y: 0, w: 1, h: 1 });
});

test("scaling past the size limits is refused before anything changes", () => {
  const doc = { width: 4000, height: 3000, layers: [{ x: 0, y: 0, canvas: { width: 4000, height: 3000 }, text: null }] };
  assert.throws(() => scaleDocument(doc, 9000, 6750), /too large/);
  assert.throws(() => scaleDocument(doc, 7000, 5250), /too large/); // 36.75 MP
  assert.deepEqual([doc.width, doc.height, doc.layers[0].canvas.width], [4000, 3000, 4000]);
});

const doc = () => ({ width: 800, height: 600, layers: [{ id: "a", x: 10, y: 20, canvas: { width: 100, height: 50 }, text: { anchor: { x: 15, y: 25 } } }] });

test("canvas size: the anchored part of the image stays put", () => {
  const d = doc();
  assert.deepEqual(canvasSizeRect(d, 1000, 700, { x: 0, y: 0 }), { x: 0, y: 0, w: 1000, h: 700 });
  assert.deepEqual(canvasSizeRect(d, 1000, 700, { x: 0.5, y: 0.5 }), { x: -100, y: -50, w: 1000, h: 700 });
  assert.deepEqual(canvasSizeRect(d, 1000, 700, { x: 1, y: 1 }), { x: -200, y: -100, w: 1000, h: 700 });
  assert.deepEqual(canvasSizeRect(d, 600, 400, { x: 0.5, y: 1 }), { x: 100, y: 200, w: 600, h: 400 });
  assert.deepEqual(canvasSizeRect(d, 801, 601, { x: 0.5, y: 0.5 }), { x: -1, y: -1, w: 801, h: 601 }); // odd difference: whole pixels
});

test("canvas size moves layers without trimming them, and respects the limits", () => {
  const d = doc();
  cropDocument(d, canvasSizeRect(d, 1000, 700, { x: 0.5, y: 0.5 }), { deletePixels: false });
  assert.deepEqual([d.width, d.height, d.layers[0].x, d.layers[0].y, d.layers[0].canvas.width], [1000, 700, 110, 70, 100]);
  assert.deepEqual(d.layers[0].text.anchor, { x: 115, y: 75 }); // editable text moves with its layer
  assert.throws(() => cropDocument(d, canvasSizeRect(d, 9000, 700, { x: 0, y: 0 }), { deletePixels: false }), /too large/);
});
