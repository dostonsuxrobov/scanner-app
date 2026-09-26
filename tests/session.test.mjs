import test from "node:test";
import assert from "node:assert/strict";
import { EditorSession } from "../src/editor/engine/session.js";
import { moveLayerTo } from "../src/editor/engine/layer.js";

// Layers with stand-in canvases: these tests exercise structure, not pixels.
function session() {
  const s = new EditorSession();
  const layer = { id: "a", name: "A", canvas: { width: 4, height: 4 }, x: 0, y: 0, opacity: 100, text: null };
  s.open({ width: 4, height: 4, name: "doc", layers: [layer], activeId: "a" });
  return s;
}

test("ending a transaction twice records it once", () => {
  const s = session();
  const tx = s.begin("Move");
  s.doc.layers[0].x = 5;
  s.end(tx);
  s.end(tx);
  assert.equal(s.history.undoLabel, "Move");
  s.undo();
  assert.equal(s.history.canUndo, false);
  assert.equal(s.doc.layers[0].x, 0);
});

test("a cancelled transaction cannot be recorded later", () => {
  const s = session();
  const tx = s.begin("Move");
  s.doc.layers[0].x = 5;
  s.cancel(tx);
  s.end(tx);
  assert.equal(s.history.canUndo, false);
  assert.equal(s.doc.layers[0].x, 0);
});

test("edits with the same merge key become one undo step and still mark changes", () => {
  const s = session();
  const set = (v) => s.edit("Opacity", () => (s.activeLayer.opacity = v), [], { merge: "a:opacity" });
  set(80);
  s.markSaved();
  set(60);
  assert.ok(s.isDirty, "a merged edit after saving is unsaved work");
  set(40);
  s.undo();
  assert.equal(s.activeLayer.opacity, 100);
  assert.equal(s.history.canUndo, false);
});

test("undoing past trimmed history still counts as changed", () => {
  const s = session();
  for (let i = 1; i <= 70; i++) s.edit(`Edit ${i}`, () => (s.activeLayer.x = i));
  while (s.undo());
  assert.equal(s.activeLayer.x, 10); // the oldest edits were trimmed
  assert.ok(s.isDirty);
});

test("opening a document clears a pending transaction", () => {
  const s = session();
  s.begin("Float");
  s.open(session().doc);
  s.edit("Next", () => {});
  assert.equal(s.history.undoLabel, "Next");
  s.undo();
  assert.equal(s.history.canUndo, false);
});

test("moving a text layer moves its anchor, without mutating shared records", () => {
  const text = { content: "hi", style: {}, anchor: { x: 10, y: 20 }, boxWidth: null };
  const layer = { x: 5, y: 5, text };
  moveLayerTo(layer, 15, 0);
  assert.deepEqual(layer.text.anchor, { x: 20, y: 15 });
  assert.deepEqual(text.anchor, { x: 10, y: 20 });
});
