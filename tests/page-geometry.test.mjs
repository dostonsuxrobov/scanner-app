import test from "node:test";
import assert from "node:assert/strict";
import { edgeMap, outlineSupport, quadSides } from "../src/lib/document/outline-support.js";
import { borderedByPaper } from "../src/lib/document/paper-border.js";
import { fitHomography } from "../src/lib/document/homography-fit.js";
import { choosePageGeometry } from "../src/lib/document/page-geometry.js";
import { computePerspectiveTransform } from "../src/lib/document/perspective.js";
import { GRID_COLS, GRID_ROWS } from "../src/lib/document/uvdoc-grid.js";
import { photo, projectPage } from "./document-fixture.mjs";

const page = projectPage({});
const unit = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
const shifted = (corners, dx, dy) => corners.map((p) => ({ x: p.x + dx, y: p.y + dy }));

function planeGrid(corners, bow = 0) {
  const H = computePerspectiveTransform(unit, corners);
  const pts = [];
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) {
      const u = c / (GRID_COLS - 1), v = r / (GRID_ROWS - 1), d = H[6] * u + H[7] * v + 1;
      pts.push({ x: (H[0] * u + H[1] * v + H[2]) / d, y: (H[3] * u + H[4] * v + H[5]) / d - bow * Math.sin(Math.PI * u) });
    }
  return pts;
}

// A grey image with rectangles painted on it, as RGBA.
function scene(width, height, background, rects) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0, p = 0; y < height; y++)
    for (let x = 0; x < width; x++, p += 4) {
      let v = background;
      for (const [x0, y0, x1, y1, value] of rects) if (x >= x0 && x < x1 && y >= y0 && y < y1) v = value;
      data[p] = data[p + 1] = data[p + 2] = v;
    }
  return data;
}
const box = (x0, y0, x1, y1) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];

test("an outline on the page's edges is supported; one across the desk or the paper is not", () => {
  const map = edgeMap(photo({ corners: page }), 800, 600);
  assert.ok(outlineSupport(map, quadSides(page)) > 0.9);
  assert.ok(outlineSupport(map, quadSides(shifted(page, 60, 0))) < 0.6);
  const inner = page.map((p) => ({ x: 400 + (p.x - 400) * 0.5, y: 300 + (p.y - 300) * 0.5 }));
  assert.ok(outlineSupport(map, quadSides(inner)) < 0.6);
});

test("an outline mostly outside the photo has no support", () => {
  const map = edgeMap(photo({ corners: page }), 800, 600);
  assert.equal(outlineSupport(map, quadSides(box(-50, -50, 850, 650))), 0);
});

test("a least-squares homography recovers a plane from all its points", () => {
  const H = computePerspectiveTransform(unit, page);
  const from = [], to = [];
  for (let i = 0; i < 40; i++) {
    const u = (i * 0.37) % 1, v = (i * 0.61) % 1, d = H[6] * u + H[7] * v + 1;
    from.push({ x: u, y: v });
    to.push({ x: (H[0] * u + H[1] * v + H[2]) / d, y: (H[3] * u + H[4] * v + H[5]) / d });
  }
  const project = fitHomography(from, to);
  const corner = project({ x: 1, y: 1 });
  assert.ok(Math.hypot(corner.x - page[2].x, corner.y - page[2].y) < 1e-6);
});

test("a photo bordered by blank paper is a page that already fills it", () => {
  const scan = scene(600, 800, 250, [[80, 100, 520, 110, 20], [80, 400, 520, 410, 20]]);
  assert.equal(borderedByPaper(edgeMap(scan, 600, 800)), true);
  assert.equal(borderedByPaper(edgeMap(photo({ corners: page }), 800, 600)), false);
});

test("a flat page on clear edges is straightened from the corners that sit on them", () => {
  const map = edgeMap(photo({ corners: page }), 800, 600);
  const wrong = planeGrid(shifted(page, 0, 70)); // the network runs past the page's bottom edge
  const geometry = choosePageGeometry(map, page, wrong);
  assert.equal(geometry.kind, "perspective");
  assert.equal(geometry.corners, page);
});

test("the page is the outer of two clear outlines, not the picture printed on it", () => {
  const sheet = box(100, 60, 700, 540), picture = box(300, 150, 500, 450);
  const map = edgeMap(scene(800, 600, 60, [[100, 60, 700, 540, 235], [300, 150, 500, 450, 40]]), 800, 600);
  const geometry = choosePageGeometry(map, picture, planeGrid(sheet));
  assert.equal(geometry.kind, "perspective");
  assert.ok(Math.abs(geometry.corners[0].x - 100) < 1 && Math.abs(geometry.corners[2].y - 540) < 1);
});

test("a curved page whose grid follows its edges is flattened through the grid", () => {
  const map = edgeMap(photo({ corners: page, bow: 30 }), 800, 600);
  assert.equal(choosePageGeometry(map, null, planeGrid(page, 30)).kind, "curved");
});

test("a page that already fills the photo is left alone", () => {
  // A clean scan; the network proposes an outline a little inside it.
  const map = edgeMap(scene(600, 800, 250, [[80, 100, 520, 110, 20], [80, 400, 520, 410, 20], [80, 700, 520, 710, 20]]), 600, 800);
  assert.equal(choosePageGeometry(map, null, planeGrid(box(30, 40, 570, 760), 12)), null);
  assert.equal(choosePageGeometry(map, null, planeGrid(box(30, 40, 570, 760))), null);
});

test("without any finder there is nothing to straighten", () => {
  assert.equal(choosePageGeometry(edgeMap(photo({ corners: page }), 800, 600), null, null), null);
});
