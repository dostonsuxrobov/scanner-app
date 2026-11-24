// A selection that covers nothing is the same as no selection.
import test from "node:test";
import assert from "node:assert/strict";
import { EditorSession } from "../src/editor/engine/session.js";
import { createSelection, nonEmpty } from "../src/editor/engine/selection/selection.js";
import { combineMasks, fullMask, invertMask, shapeMask } from "../src/editor/engine/selection/mask.js";

function session() {
  const s = new EditorSession();
  s.open({ width: 10, height: 10, name: "doc", layers: [{ id: "a", canvas: { width: 10, height: 10 }, x: 0, y: 0, text: null }], activeId: "a" });
  return s;
}

const all = () => createSelection(fullMask(10, 10), 10, 10);

test("inverting 'select all' leaves no selection", () => {
  const s = session();
  s.setSelection(all());
  s.setSelection(createSelection(invertMask(s.selection.mask), 10, 10), "Invert selection");
  assert.equal(s.selection, null);
  s.undo();
  assert.equal(s.selection.count, 100);
});

test("subtracting everything leaves no selection", () => {
  const s = session();
  const small = shapeMask(10, 10, { x: 2, y: 2, w: 3, h: 3 });
  s.setSelection(createSelection(combineMasks(small, fullMask(10, 10), "subtract"), 10, 10));
  assert.equal(s.selection, null);
});

test("a rectangle entirely off the canvas selects nothing", () => {
  const s = session();
  s.setSelection(createSelection(shapeMask(10, 10, { x: 40, y: 40, w: 5, h: 5 }), 10, 10));
  assert.equal(s.selection, null);
});

test("previews are normalised too, and real selections pass through", () => {
  const s = session();
  s.previewSelection(createSelection(new Uint8ClampedArray(100), 10, 10));
  assert.equal(s.selection, null);
  const kept = all();
  s.previewSelection(kept);
  assert.equal(s.selection, kept);
  assert.equal(nonEmpty(null), null);
});
