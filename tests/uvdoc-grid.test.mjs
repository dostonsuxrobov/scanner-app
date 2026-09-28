import test from "node:test";
import assert from "node:assert/strict";
import { GRID_COLS, GRID_ROWS, gridToPixels, gridCorners } from "../src/lib/document/uvdoc-grid.js";
import { curvature, surfaceLengths } from "../src/lib/document/grid-analysis.js";
import { unwarpWithGrid } from "../src/lib/document/grid-unwarp.js";
import { uvdocInput, UVDOC_WIDTH, UVDOC_HEIGHT } from "../src/lib/document/uvdoc-input.js";
import { applyPerspectiveTransform, computePerspectiveTransform } from "../src/lib/document/perspective.js";
import { oneClickFix } from "../src/lib/document/one-click-fix.js";
import { photo, projectPage } from "./document-fixture.mjs";

const unit = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

// Grid of a flat page seen through homography H (unit square → photo).
function planeGrid(corners) {
  const H = computePerspectiveTransform(unit, corners);
  const pts = [];
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) {
      const u = c / (GRID_COLS - 1), v = r / (GRID_ROWS - 1), d = H[6] * u + H[7] * v + 1;
      pts.push({ x: (H[0] * u + H[1] * v + H[2]) / d, y: (H[3] * u + H[4] * v + H[5]) / d });
    }
  return pts;
}

// Grid of a page curling like an open book: rows bow by `bow` px.
function curledGrid(corners, bow) {
  return planeGrid(corners).map((p, i) => {
    const c = i % GRID_COLS;
    return { x: p.x, y: p.y - bow * Math.sin((Math.PI * c) / (GRID_COLS - 1)) };
  });
}

const page = projectPage({});

test("a flat page's grid has no curvature; a curled one does", () => {
  assert.ok(curvature(planeGrid(page)) < 1e-6);
  assert.ok(curvature(curledGrid(page, 30)) > 8);
});

test("surface lengths follow the paper, not the chord", () => {
  const flat = surfaceLengths(planeGrid(page));
  const curled = surfaceLengths(curledGrid(page, 40));
  assert.ok(curled.width > flat.width * 1.02);
});

test("unwarping through a flat grid matches the exact perspective warp", () => {
  const data = photo({ corners: page });
  const [w, h] = [210, 297];
  const viaGrid = unwarpWithGrid(data, 800, 600, planeGrid(page), w, h);
  const exact = applyPerspectiveTransform(data, 800, 600, page, w, h);
  let diff = 0;
  for (let i = 0; i < exact.length; i += 4) diff += Math.abs(viaGrid[i] - exact[i]);
  assert.ok(diff / (w * h) < 12, `mean difference ${diff / (w * h)}`);
});

test("grid coordinates map [-1, 1] onto the region's pixel range", () => {
  const n = GRID_ROWS * GRID_COLS;
  const raw = new Float32Array(2 * n).fill(-1);
  raw[n - 1] = 1; // last point x
  raw[2 * n - 1] = 1; // last point y
  const pts = gridToPixels(raw, { x: 10, y: 20, w: 101, h: 51 });
  assert.deepEqual(pts[0], { x: 10, y: 20 });
  assert.deepEqual(pts[n - 1], { x: 110, y: 70 });
  assert.deepEqual(gridCorners(pts)[2], { x: 110, y: 70 });
});

test("network input is a resized region as planar RGB in [0, 1]", () => {
  const data = new Uint8ClampedArray(4 * 4 * 4).fill(0);
  data.set([255, 128, 0, 255], (1 * 4 + 1) * 4); // pixel (1,1)
  const tensor = uvdocInput(data, 4, 4, { x: 1, y: 1, w: 3, h: 3 });
  assert.equal(tensor.length, 3 * UVDOC_WIDTH * UVDOC_HEIGHT);
  const plane = UVDOC_WIDTH * UVDOC_HEIGHT;
  assert.equal(tensor[0], 1); // red at the region's top-left
  assert.ok(Math.abs(tensor[plane] - 128 / 255) < 1e-6);
  assert.equal(tensor[2 * plane], 0);
});

test("curved pages are flattened through the network's grid", async () => {
  const out = await oneClickFix(photo({ corners: page }), 800, 600, { predictGrid: async () => curledGrid(page, 30) });
  assert.equal(out.method, "curved");
  assert.ok(out.height > out.width);
});

test("flat pages use the exact perspective warp even with the network", async () => {
  const out = await oneClickFix(photo({ corners: page }), 800, 600, { predictGrid: async () => planeGrid(page) });
  assert.equal(out.method, "perspective");
  assert.equal(out.paper, "A4");
});

test("the network finds a page the classic detector cannot", async () => {
  // A page as bright as its surroundings has no detectable outline.
  const data = photo({ corners: page, desk: 235, shadow: 0 });
  const out = await oneClickFix(data, 800, 600, { predictGrid: async () => planeGrid(page) });
  assert.equal(out.method, "perspective");
});

test("if the network fails, the classic fix is used and the reason kept", async () => {
  const out = await oneClickFix(photo({ corners: page }), 800, 600, {
    predictGrid: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(out.method, "perspective");
  assert.equal(out.aiError, "offline");
});

test("the network looks at the whole photo", async () => {
  const regions = [];
  await oneClickFix(photo({ corners: page }), 800, 600, {
    predictGrid: async (region) => (regions.push(region), planeGrid(page)),
  });
  assert.deepEqual(regions[0], { x: 0, y: 0, w: 800, h: 600 });
});

test("a small page gets a second, closer look", async () => {
  const small = [{ x: 300, y: 200 }, { x: 420, y: 205 }, { x: 415, y: 370 }, { x: 305, y: 365 }];
  const regions = [];
  await oneClickFix(photo({ corners: small }), 800, 600, {
    predictGrid: async (region) => (regions.push(region), planeGrid(small)),
  });
  assert.equal(regions.length, 2);
  const r = regions[1];
  assert.ok(r.x < 300 && r.y < 200 && r.x + r.w > 420 && r.y + r.h > 370, JSON.stringify(r));
  assert.ok(r.w * r.h < 800 * 600 * 0.2);
});

test("the network's page wins when the classic detector found something else", async () => {
  // The classic detector sees the portrait page; the network says the page
  // is a wide sheet around it, as when the detector locks onto a picture.
  const wide = [{ x: 60, y: 40 }, { x: 740, y: 40 }, { x: 740, y: 560 }, { x: 60, y: 560 }];
  const out = await oneClickFix(photo({ corners: page }), 800, 600, { predictGrid: async () => planeGrid(wide) });
  assert.equal(out.method, "perspective");
  assert.ok(out.width > out.height, `${out.width}×${out.height}`);
});
