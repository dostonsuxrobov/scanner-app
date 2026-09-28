import test from "node:test";
import assert from "node:assert/strict";
import { detectDocument } from "../src/lib/document/detect-document.js";
import { pageSize } from "../src/lib/document/output-size.js";
import { otsuThreshold } from "../src/lib/document/otsu.js";
import { orderCorners } from "../src/lib/document/quad-fit.js";
import { oneClickFix } from "../src/lib/document/one-click-fix.js";
import { rectangleAspect } from "../src/lib/document/aspect-ratio.js";
import { photo, projectPage, lumsIn, darkest, brightest } from "./document-fixture.mjs";

// A real A4 sheet seen by a camera at an angle (tilted, turned, rotated).
const tilted = projectPage({});

function assertNear(found, expected, tolerance) {
  found.forEach((p, i) => {
    const d = Math.hypot(p.x - expected[i].x, p.y - expected[i].y);
    assert.ok(d <= tolerance, `corner ${i} off by ${d.toFixed(1)} px`);
  });
}

test("finds the corners of a tilted page on a darker desk", () => {
  const result = detectDocument(photo({ corners: tilted }), 800, 600);
  assert.ok(result.found);
  assertNear(result.corners, tilted, 8);
});

test("finds a page despite a strong lighting gradient", () => {
  const result = detectDocument(photo({ corners: tilted, shadow: 0.6, paper: 250 }), 800, 600);
  assert.ok(result.found);
  assertNear(result.corners, tilted, 10);
});

test("finds a dark page on a light desk", () => {
  const result = detectDocument(photo({ corners: tilted, desk: 225, paper: 110, shadow: 0 }), 800, 600);
  assert.ok(result.found);
  assertNear(result.corners, tilted, 8);
});

test("reports nothing when there is no page", () => {
  const flat = photo({ corners: [{ x: -10, y: -10 }, { x: -5, y: -10 }, { x: -5, y: -5 }, { x: -10, y: -5 }] });
  assert.equal(detectDocument(flat, 800, 600).found, false);
});

test("corners are ordered clockwise from top-left", () => {
  const shuffled = [tilted[2], tilted[0], tilted[3], tilted[1]];
  assert.deepEqual(orderCorners(shuffled), tilted);
});

test("otsu separates two populations", () => {
  const t = otsuThreshold(Float32Array.from([...Array(100).fill(50), ...Array(100).fill(200)]));
  assert.ok(t >= 50 && t < 200);
});

test("true proportions are recovered from a perspective view", () => {
  for (const [tilt, turn, page] of [[0.5, 0.25, [210, 297]], [0.9, -0.3, [216, 279]], [0.2, 0.6, [300, 150]]]) {
    const corners = projectPage({ tilt, turn, page });
    const aspect = rectangleAspect(corners, 800, 600);
    assert.ok(Math.abs(aspect - page[0] / page[1]) < 0.01, `${aspect} vs ${page[0] / page[1]}`);
  }
  // The foreshortened edge lengths alone would be far off.
  const [tl, tr, , bl] = tilted;
  const naive = Math.hypot(tr.x - tl.x, tr.y - tl.y) / Math.hypot(bl.x - tl.x, bl.y - tl.y);
  assert.ok(Math.abs(naive - 210 / 297) > 0.1);
});

test("near-A4 pages snap to A4 proportions at scanner resolution", () => {
  const size = pageSize([{ x: 0, y: 0 }, { x: 700, y: 0 }, { x: 700, y: 1000 }, { x: 0, y: 1000 }], 800, 1100);
  assert.equal(size.paper, "A4");
  assert.ok(Math.abs(size.height / size.width - Math.SQRT2) < 0.002);
  assert.ok(size.height >= 1600);
});

test("odd proportions are kept and huge pages are capped", () => {
  const size = pageSize([{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 5000 }, { x: 0, y: 5000 }], 6000, 6000);
  assert.equal(size.paper, null);
  assert.deepEqual([size.width, size.height], [3508, 3508]);
});

test("one-click fix straightens the page and makes shaded paper white with dark text", () => {
  const out = oneClickFix(photo({ corners: tilted }), 800, 600);
  assert.ok(out.straightened);
  assert.equal(out.paper, "A4");
  assert.ok(out.height > out.width);
  // In the shaded right part of the page, paper is now white and text dark.
  const margin = lumsIn(out.data, out.width, out.height, [0.93, 0.98, 0.3, 0.7]);
  assert.ok(darkest(margin, 0.5) > 235, `shaded margin is ${darkest(margin, 0.5).toFixed(0)}`);
  const text = lumsIn(out.data, out.width, out.height, [0.6, 0.85, 0.2, 0.8]);
  assert.ok(brightest(text, 0.4) > 240, `shaded paper between lines is ${brightest(text, 0.4).toFixed(0)}`);
  assert.ok(darkest(text, 0.2) < 60, `shaded ink is ${darkest(text, 0.2).toFixed(0)}`);
});

test("a colour cast on the paper is neutralised", () => {
  // Warm (tungsten-like) light: blue is much weaker than red.
  const data = photo({ corners: tilted, shadow: 0.3 });
  for (let p = 0; p < data.length; p += 4) data[p + 2] *= 0.8;
  const out = oneClickFix(data, 800, 600);
  const [cx, cy] = [Math.floor(out.width * 0.95), Math.floor(out.height * 0.5)];
  const p = (cy * out.width + cx) * 4;
  assert.ok(Math.abs(out.data[p] - out.data[p + 2]) <= 6, `paper is rgb(${out.data[p]}, ${out.data[p + 1]}, ${out.data[p + 2]})`);
});

test("without page edges the whole photo is cleaned in place", () => {
  const data = photo({ corners: [{ x: -2, y: -2 }, { x: 802, y: -2 }, { x: 802, y: 602 }, { x: -2, y: 602 }] });
  const out = oneClickFix(data, 800, 600);
  assert.equal(out.straightened, false);
  assert.deepEqual([out.width, out.height], [800, 600]);
});
