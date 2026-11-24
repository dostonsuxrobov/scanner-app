// Moves, flips, and quarter turns must map pixels onto pixels (no blur).
import test from "node:test";
import assert from "node:assert/strict";
import { createDraft, draftBounds, draftMatrix, isIdentity, snapDraft } from "../src/editor/engine/transform/transform-draft.js";

const source = (width, height) => ({ width, height });
const isWhole = (matrix) => matrix.every((v) => Number.isInteger(v));
const matrix = (d) => draftMatrix(d).map((v) => v + 0); // -0 → 0

test("a quarter turn of a layer with an odd width/height difference lands on whole pixels", () => {
  const start = createDraft("a", source(1241, 1754), 0, 0);
  for (const angle of [90, -90]) {
    const d = snapDraft({ ...start, angle });
    assert.ok(isWhole(draftMatrix(d)), `matrix ${draftMatrix(d)}`);
    const b = draftBounds(d);
    assert.deepEqual([b.w, b.h], [1754, 1241]); // not one pixel larger
  }
});

test("quarter turns use exact 0 and ±1, also when the size difference is even", () => {
  const d = snapDraft({ ...createDraft("a", source(2480, 3508), 10, 20), angle: 90 });
  assert.deepEqual(matrix(d), [0, 1, -1, 0, 3004, 534]);
  assert.deepEqual(matrix({ ...d, angle: 180 }).slice(0, 4), [-1, 0, 0, -1]);
});

test("dragging by a fraction of a pixel moves by whole pixels", () => {
  const start = createDraft("a", source(100, 100), 5, 5);
  const d = snapDraft({ ...start, cx: start.cx + 10.37, cy: start.cy + 4.81 });
  assert.deepEqual(matrix(d), [1, 0, 0, 1, 15, 10]);
  assert.deepEqual(draftBounds(d), { x: 15, y: 10, w: 100, h: 100 });
  assert.ok(isIdentity(snapDraft({ ...start, cx: start.cx + 0.3 })), "a sub-pixel nudge is no change at all");
});

test("a flipped layer stays in place", () => {
  const start = createDraft("a", source(101, 50), 3, 4);
  assert.deepEqual(matrix(snapDraft({ ...start, flipX: true })), [-1, 0, 0, 1, 104, 4]);
});

test("free rotation and fractional sizes are left alone", () => {
  const start = createDraft("a", source(100, 100), 0, 0);
  const rotated = { ...start, angle: 12.5, cx: 50.4 };
  assert.equal(snapDraft(rotated), rotated);
  const scaled = { ...start, w: 150.5, cx: 75.25 };
  assert.equal(snapDraft(scaled), scaled);
});
