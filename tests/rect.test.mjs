import test from "node:test";
import assert from "node:assert/strict";
import { intersect, union, rectFromPoints, roundOut, isEmptyRect } from "../src/editor/engine/rect.js";

test("rectangles from points are normalized", () => {
  assert.deepEqual(rectFromPoints({ x: 5, y: 8 }, { x: 1, y: 2 }), { x: 1, y: 2, w: 4, h: 6 });
});

test("intersection and union", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 5, y: 5, w: 10, h: 10 };
  assert.deepEqual(intersect(a, b), { x: 5, y: 5, w: 5, h: 5 });
  assert.deepEqual(union(a, b), { x: 0, y: 0, w: 15, h: 15 });
  assert.ok(isEmptyRect(intersect(a, { x: 20, y: 20, w: 1, h: 1 })));
});

test("rounding outward never loses coverage", () => {
  assert.deepEqual(roundOut({ x: 0.5, y: 1.2, w: 2, h: 1 }), { x: 0, y: 1, w: 3, h: 2 });
});
