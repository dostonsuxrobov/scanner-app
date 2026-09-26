import test from "node:test";
import assert from "node:assert/strict";
import { createHistory } from "../src/editor/engine/history.js";

// Each entry swaps a value, mirroring how the session swaps document state.
function harness() {
  const doc = { value: 0 };
  const history = createHistory({ maxEntries: 3 });
  const apply = (entry) => {
    const current = doc.value;
    doc.value = entry.state;
    entry.state = current;
    return entry;
  };
  const edit = (value) => {
    history.push({ label: `set ${value}`, state: doc.value });
    doc.value = value;
  };
  return { doc, history, apply, edit };
}

test("undo and redo swap state symmetrically", () => {
  const { doc, history, apply, edit } = harness();
  edit(1);
  edit(2);
  history.undo(apply);
  assert.equal(doc.value, 1);
  history.undo(apply);
  assert.equal(doc.value, 0);
  history.redo(apply);
  history.redo(apply);
  assert.equal(doc.value, 2);
});

test("a new edit discards the redo stack", () => {
  const { doc, history, apply, edit } = harness();
  edit(1);
  history.undo(apply);
  edit(5);
  assert.equal(history.canRedo, false);
  assert.equal(doc.value, 5);
});

test("current id differs after undo followed by a new edit", () => {
  const { history, apply, edit } = harness();
  edit(1);
  const saved = history.currentId;
  history.undo(apply);
  edit(1);
  assert.notEqual(history.currentId, saved);
});

test("the stack is bounded by entry count", () => {
  const { history, apply, edit } = harness();
  for (let i = 1; i <= 5; i++) edit(i);
  let undone = 0;
  while (history.undo(apply)) undone++;
  assert.equal(undone, 3);
});

test("labels describe the next undo and redo", () => {
  const { history, apply, edit } = harness();
  edit(7);
  assert.equal(history.undoLabel, "set 7");
  history.undo(apply);
  assert.equal(history.redoLabel, "set 7");
});
