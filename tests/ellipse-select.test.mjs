import test from "node:test";
import assert from "node:assert/strict";
import { buildRectSelection } from "../src/editor/tools/rect-select-tool.js";

const doc = { width: 60, height: 40 };
const at = (s, x, y) => s.mask[y * doc.width + x];
const options = { kind: "ellipse", radius: 0, feather: 0 };
const box = { x: 10, y: 5, w: 40, h: 30 };

test("an ellipse fills its box except the corners", () => {
  const s = buildRectSelection(doc, box, options, "replace", null);
  assert.equal(at(s, 30, 20), 255); // centre
  assert.equal(at(s, 10, 5), 0); // corners of the box
  assert.equal(at(s, 49, 34), 0);
  assert.equal(at(s, 11, 20), 255); // left and right ends of the long axis
  assert.equal(at(s, 48, 20), 255);
  assert.deepEqual([s.bounds.x, s.bounds.y, s.bounds.w, s.bounds.h], [10, 5, 40, 30]);
  const area = s.mask.reduce((n, v) => n + v, 0) / 255;
  assert.ok(Math.abs(area - Math.PI * 20 * 15) < 12, `area ${area}`); // π·a·b, antialiased edge
});

test("the editable shape remembers it is an ellipse; a rectangle is the default", () => {
  const s = buildRectSelection(doc, box, options, "replace", null);
  assert.deepEqual(s.shape, { type: "rect", kind: "ellipse", rect: box, radius: 0, feather: 0 });
  // Adjusting it (handles, numeric fields) rebuilds from the stored shape.
  const moved = buildRectSelection(doc, { ...box, x: 12 }, s.shape, "replace", null);
  assert.equal(at(moved, 12, 5), 0);
  assert.equal(moved.shape.kind, "ellipse");
  const rect = buildRectSelection(doc, box, { radius: 0, feather: 0 }, "replace", null);
  assert.equal(rect.shape.kind, "rect");
  assert.equal(at(rect, 10, 5), 255);
});

test("add, subtract, and intersect work with ellipses", () => {
  const base = buildRectSelection(doc, { x: 0, y: 0, w: 30, h: 40 }, { radius: 0, feather: 0 }, "replace", null); // left half
  const added = buildRectSelection(doc, box, options, "add", base);
  assert.equal(at(added, 2, 2), 255);
  assert.equal(at(added, 45, 20), 255);
  assert.equal(at(added, 49, 5), 0);
  const cut = buildRectSelection(doc, box, options, "subtract", base);
  assert.equal(at(cut, 2, 2), 255);
  assert.equal(at(cut, 20, 20), 0);
  assert.equal(at(cut, 10, 5), 255); // the box's corner is outside the ellipse, so it stays
  const both = buildRectSelection(doc, box, options, "intersect", base);
  assert.equal(at(both, 20, 20), 255);
  assert.equal(at(both, 2, 2), 0);
  assert.equal(at(both, 45, 20), 0);
  assert.equal(added.shape, null); // combined selections have no single editable shape
});

test("a feathered ellipse has a soft edge", () => {
  const s = buildRectSelection(doc, box, { ...options, feather: 4 }, "replace", null);
  assert.ok(at(s, 30, 20) > 250);
  const edge = at(s, 10, 20);
  assert.ok(edge > 60 && edge < 200, `edge ${edge}`);
});
