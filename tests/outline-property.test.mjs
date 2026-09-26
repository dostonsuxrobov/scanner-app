import test from "node:test";
import assert from "node:assert/strict";
import { maskOutline } from "../src/editor/engine/selection/outline.js";
import { maskBounds } from "../src/editor/engine/selection/mask-bounds.js";

// Brute force: every unit edge between inside/outside pixels, merged into
// maximal straight runs. The outline must describe exactly the same runs.
function reference(mask, w, h) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] > 127;
  const runs = [];
  for (let y = 0; y <= h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const edge = x < w && inside(x, y - 1) !== inside(x, y);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) runs.push([start, y, x, y]), (start = -1);
    }
  }
  for (let x = 0; x <= w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const edge = y < h && inside(x - 1, y) !== inside(x, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) runs.push([x, start, x, y]), (start = -1);
    }
  }
  return runs.map((r) => r.join(",")).sort();
}

function random(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test("outline matches a brute-force trace on random masks", () => {
  const rand = random(7);
  for (let trial = 0; trial < 40; trial++) {
    const w = 1 + Math.floor(rand() * 17), h = 1 + Math.floor(rand() * 13);
    const density = rand();
    const mask = Uint8ClampedArray.from({ length: w * h }, () => (rand() < density ? (rand() < 0.5 ? 255 : 128) : rand() < 0.5 ? 0 : 127));
    const segments = maskOutline(mask, w, h, maskBounds(mask, w, h));
    const got = [];
    for (let i = 0; i < segments.length; i += 4) got.push([...segments.slice(i, i + 4)].join(","));
    assert.deepEqual(got.sort(), reference(mask, w, h), `trial ${trial} (${w}×${h})`);
  }
});
