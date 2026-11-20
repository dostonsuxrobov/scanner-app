import test from "node:test";
import assert from "node:assert/strict";
import { fitLongEdge } from "../src/lib/pdf/fit-long-edge.js";

test("large pages shrink so the long edge matches the cap, keeping aspect ratio", () => {
  assert.deepEqual(fitLongEdge(3000, 4000, 2000), { width: 1500, height: 2000 });
  assert.deepEqual(fitLongEdge(4000, 3000, 2000), { width: 2000, height: 1500 });
});

test("pages already within the cap are never upscaled", () => {
  assert.deepEqual(fitLongEdge(1190, 1684, 2339), { width: 1190, height: 1684 });
});

test("an infinite cap leaves the size unchanged", () => {
  assert.deepEqual(fitLongEdge(5000, 7000, Infinity), { width: 5000, height: 7000 });
});
