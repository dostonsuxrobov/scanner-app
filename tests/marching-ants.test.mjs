import test from "node:test";
import assert from "node:assert/strict";
import { antsAnimated, drawMarchingAnts } from "../src/editor/overlay/marching-ants.js";

// Records the path a drawing builds.
function recorder() {
  const lines = [];
  let from = null;
  const ctx = { lines, strokes: 0, dashOffsets: [], save() {}, restore() {}, beginPath() {}, setLineDash() {} };
  ctx.moveTo = (x, y) => (from = [x, y]);
  ctx.lineTo = (x, y) => lines.push([...from, x, y]);
  ctx.stroke = () => (ctx.strokes++, ctx.dashOffsets.push(ctx.lineDashOffset));
  return ctx;
}

const view = (zoom, x = 0, y = 0) => ({ zoom, x, y, width: 200, height: 100 });

test("visible segments are drawn on pixel centres", () => {
  const ctx = recorder();
  drawMarchingAnts(ctx, Int32Array.of(10, 10, 50, 10, 50, 10, 50, 40), view(2, 5, 5), 3);
  assert.deepEqual(ctx.lines, [[25.5, 25.5, 105.5, 25.5], [105.5, 25.5, 105.5, 85.5]]);
  assert.equal(ctx.strokes, 2);
  assert.equal(ctx.dashOffsets[1], -3);
});

test("segments off screen or shorter than a pixel are left out", () => {
  const ctx = recorder();
  const segments = Int32Array.of(
    0, 0, 3, 0, // 0.3 px on screen
    500, 500, 900, 500, // visible
    500, 2000, 900, 2000, // below the viewport
    3000, 0, 3000, 500, // right of the viewport
    -900, 300, -100, 300, // left of the viewport
  );
  drawMarchingAnts(ctx, segments, view(0.1), 0);
  assert.deepEqual(ctx.lines, [[50.5, 50.5, 90.5, 50.5]]);
});

test("very large outlines are not animated", () => {
  assert.equal(antsAnimated(new Int32Array(4 * 1000)), true);
  const large = new Int32Array(4 * 120_001);
  assert.equal(antsAnimated(large), false);
  const ctx = recorder();
  drawMarchingAnts(ctx, large, view(1), 5);
  assert.equal(ctx.dashOffsets[1], 0);
});
