// Cropping may enlarge the canvas, but never past the editor's size limits.
import test from "node:test";
import assert from "node:assert/strict";
import { cropDocument } from "../src/editor/engine/crop-document.js";
import { validateProject } from "../src/editor/engine/io/project-format.js";

const doc = (width, height) => ({ width, height, layers: [{ id: "a", canvas: { width, height }, x: 0, y: 0, text: { anchor: { x: 0, y: 0 } } }] });

test("enlarging past a side or the megapixel limit is refused before anything changes", () => {
  for (const rect of [{ x: 0, y: 0, w: 9000, h: 3000 }, { x: -50, y: -50, w: 6928, h: 5300 }, { x: 0, y: 0, w: 0, h: 10 }]) {
    const d = doc(6928, 5196);
    assert.throws(() => cropDocument(d, rect), /too large|megapixels/);
    assert.deepEqual([d.width, d.height, d.layers[0].x, d.layers[0].y], [6928, 5196, 0, 0]);
  }
});

test("a crop that is accepted always gives a size a saved project can reopen", () => {
  const d = doc(4000, 3000);
  cropDocument(d, { x: -100, y: -50, w: 4200, h: 3100 }, { deletePixels: false }); // text layers only move
  assert.deepEqual([d.width, d.height, d.layers[0].x, d.layers[0].y], [4200, 3100, 100, 50]);
  // Size passes; the project is then rejected only for having no layers.
  assert.throws(() => validateProject({ type: "simple-editor-project", version: 3, document: { width: d.width, height: d.height, layers: [] } }), /no usable layers/);
});
