// The undo budget charges an entry only for what it alone keeps alive.
import test from "node:test";
import assert from "node:assert/strict";
import { EditorSession } from "../src/editor/engine/session.js";

// Stand-ins: the budget only looks at sizes, never at pixels.
const selection = (pixels) => ({ mask: { length: pixels }, bounds: {}, count: 1, cache: {} });

function session(width, height) {
  const s = new EditorSession();
  const layer = { id: "a", name: "A", canvas: { width, height }, x: 0, y: 0, opacity: 100, text: null };
  s.open({ width, height, name: "doc", layers: [layer], activeId: "a" });
  return s;
}

function nudge(s, times) {
  for (let i = 0; i < times; i++) {
    const tx = s.begin(`Nudge ${i}`);
    s.doc.layers[0].x = i + 1;
    s.end(tx);
  }
}

const undoDepth = (s) => {
  let n = 0;
  while (s.undo()) n++;
  return n;
};

test("an active selection does not shorten the undo history", () => {
  const s = session(4000, 3000); // 12 MP: its mask and clip canvas are ~60 MB
  s.setSelection(selection(4000 * 3000), "Select");
  nudge(s, 40);
  assert.equal(undoDepth(s), 41); // the 40 edits and the selection itself
});

test("a selection that only the history still holds is charged once", () => {
  const s = session(6000, 6000);
  // Each replaced selection (~180 MB) is kept alive by one entry.
  for (let i = 0; i < 5; i++) s.setSelection(selection(6000 * 6000), `Select ${i}`);
  nudge(s, 10);
  const depth = undoDepth(s);
  assert.ok(depth >= 11 && depth < 15, `kept ${depth} steps`); // old selections trimmed, edits kept
});
