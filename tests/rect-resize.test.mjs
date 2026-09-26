import test from "node:test";
import assert from "node:assert/strict";
import { dragRect, resizeRect } from "../src/editor/engine/rect-resize.js";

test("dragging in any direction normalizes the rectangle", () => {
  assert.deepEqual(dragRect({ x: 10, y: 10 }, { x: 4, y: 2 }), { x: 4, y: 2, w: 6, h: 8 });
});

test("a ratio constrains the drag", () => {
  assert.deepEqual(dragRect({ x: 0, y: 0 }, { x: 10, y: 3 }, { ratio: 1 }), { x: 0, y: 0, w: 10, h: 10 });
});

test("dragging from the centre doubles the size", () => {
  assert.deepEqual(dragRect({ x: 10, y: 10 }, { x: 13, y: 14 }, { fromCenter: true }), { x: 7, y: 6, w: 6, h: 8 });
});

test("the west handle keeps the east side fixed", () => {
  assert.deepEqual(resizeRect({ x: 10, y: 10, w: 20, h: 10 }, "w", -5, 99), { x: 5, y: 10, w: 25, h: 10 });
});

test("dragging past the opposite side flips instead of collapsing", () => {
  assert.deepEqual(resizeRect({ x: 10, y: 10, w: 20, h: 10 }, "e", -30, 0), { x: 0, y: 10, w: 10, h: 10 });
});

test("the move handle translates", () => {
  assert.deepEqual(resizeRect({ x: 1, y: 2, w: 3, h: 4 }, "move", 5, 5), { x: 6, y: 7, w: 3, h: 4 });
});

test("ratio is kept when resizing an edge", () => {
  const r = resizeRect({ x: 0, y: 0, w: 20, h: 10 }, "e", 20, 0, { ratio: 2 });
  assert.deepEqual([r.w, r.h], [40, 20]);
});
