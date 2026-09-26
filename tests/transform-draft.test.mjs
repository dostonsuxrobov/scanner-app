import test from "node:test";
import assert from "node:assert/strict";
import { resizeDraft, rotateDraft, draftBounds, draftMatrix, normalizeAngle } from "../src/editor/engine/transform/transform-draft.js";

const draft = (props = {}) => ({ sourceW: 100, sourceH: 50, cx: 50, cy: 25, w: 100, h: 50, angle: 0, flipX: false, flipY: false, ...props });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

test("dragging the east handle keeps the west edge fixed", () => {
  const next = resizeDraft(draft(), "e", { x: 150, y: 25 });
  close(next.w, 150);
  close(next.cx - next.w / 2, 0);
});

test("corner drag with aspect lock keeps proportions", () => {
  const next = resizeDraft(draft(), "se", { x: 200, y: 60 }, { keepAspect: true });
  close(next.w / next.h, 2);
  close(next.w, 200);
});

test("resizing from the centre keeps the centre", () => {
  const next = resizeDraft(draft(), "e", { x: 110, y: 25 }, { fromCenter: true });
  close(next.cx, 50);
  close(next.w, 120);
});

test("resizing a rotated draft works in the rotated frame", () => {
  const next = resizeDraft(draft({ angle: 90 }), "e", { x: 50, y: 125 });
  close(next.w, 150);
});

test("rotation snaps to 15 degrees", () => {
  const next = rotateDraft(draft(), { x: 100, y: 25 }, { x: 50, y: 80 }, true);
  assert.equal(next.angle, 90);
});

test("angles normalize to (-180, 180]", () => {
  assert.equal(normalizeAngle(270), -90);
  assert.equal(normalizeAngle(-190), 170);
});

test("identity matrix maps source pixels onto the layer position", () => {
  const [a, b, c, d, e, f] = draftMatrix(draft());
  assert.deepEqual([a, b, c, d], [1, 0, -0, 1]);
  close(e, 0);
  close(f, 0);
});

test("bounds of a 90° rotation swap dimensions", () => {
  const b = draftBounds(draft({ angle: 90 }));
  assert.deepEqual([b.w, b.h], [50, 100]);
});

test("a moved draft is not an identity transform", async () => {
  const { createDraft, isIdentity } = await import("../src/editor/engine/transform/transform-draft.js");
  const d = createDraft("l", { width: 10, height: 10 }, 0, 0);
  assert.ok(isIdentity(d));
  assert.ok(!isIdentity({ ...d, cx: d.cx + 5 }));
});
