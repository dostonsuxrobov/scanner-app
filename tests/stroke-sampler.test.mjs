import test from "node:test";
import assert from "node:assert/strict";
import { createStrokeSampler } from "../src/editor/engine/paint/stroke-sampler.js";

test("dabs are evenly spaced along the path", () => {
  const sampler = createStrokeSampler({ spacing: 2 });
  const dabs = [...sampler.add({ x: 0, y: 0 }), ...sampler.add({ x: 10, y: 0 })];
  assert.deepEqual(dabs.map((d) => d.x), [0, 2, 4, 6, 8, 10]);
});

test("spacing carries across pointer events", () => {
  const sampler = createStrokeSampler({ spacing: 4 });
  const dabs = [...sampler.add({ x: 0, y: 0 }), ...sampler.add({ x: 3, y: 0 }), ...sampler.add({ x: 9, y: 0 })];
  assert.deepEqual(dabs.map((d) => d.x), [0, 4, 8]);
});

test("smoothing lags behind and the stroke still reaches the end", () => {
  const sampler = createStrokeSampler({ spacing: 1, smoothing: 80 });
  sampler.add({ x: 0, y: 0 });
  const mid = sampler.add({ x: 100, y: 0 });
  assert.ok(mid.length && mid[mid.length - 1].x < 50);
  const tail = sampler.finish();
  assert.ok(Math.abs(tail[tail.length - 1].x - 100) <= 1);
});
