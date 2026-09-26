import test from "node:test";
import assert from "node:assert/strict";
import { zoomAt, screenToDoc, fitView, stepZoom, clampPan, formatZoom } from "../src/editor/engine/view/viewport.js";

test("zooming keeps the point under the cursor fixed", () => {
  const view = { zoom: 1, x: 10, y: 20 };
  const before = screenToDoc(view, 300, 200);
  const after = screenToDoc(zoomAt(view, 3, 300, 200), 300, 200);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
});

test("fit never enlarges beyond 100% and centres the image", () => {
  const view = fitView(100, 50, 1000, 800);
  assert.equal(view.zoom, 1);
  assert.equal(view.x, 450);
  assert.equal(view.y, 375);
  assert.ok(fitView(4000, 3000, 1000, 800).zoom < 0.25);
});

test("zoom steps move to the next preset in either direction", () => {
  assert.equal(stepZoom(1, 1), 1.5);
  assert.equal(stepZoom(1, -1), 0.6667);
  assert.equal(stepZoom(0.7, -1), 0.6667);
});

test("panning cannot lose the document off screen", () => {
  const view = clampPan({ zoom: 1, x: -5000, y: 5000 }, 1000, 1000, 800, 600);
  assert.equal(view.x, 48 - 1000);
  assert.equal(view.y, 600 - 48);
});

test("zoom labels", () => {
  assert.equal(formatZoom(1), "100%");
  assert.equal(formatZoom(0.0625), "6.3%");
});
