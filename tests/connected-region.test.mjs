import test from "node:test";
import assert from "node:assert/strict";
import { connectedRegion } from "../src/editor/engine/selection/connected-region.js";

// "#" is selectable, "." is not.
const parse = (art) => {
  const rows = art.trim().split("\n").map((r) => r.trim());
  return { width: rows[0].length, height: rows.length, mask: Uint8ClampedArray.from(rows.join(""), (c) => (c === "#" ? 255 : 0)) };
};
const show = (mask, width) => Array.from({ length: mask.length / width }, (_, y) => [...mask.slice(y * width, (y + 1) * width)].map((v) => (v ? "#" : ".")).join("")).join("\n");
const fill = (art, x, y) => { const { mask, width, height } = parse(art); return show(connectedRegion(mask, width, height, x, y), width); };
const tidy = (art) => art.trim().split("\n").map((r) => r.trim()).join("\n");

test("keeps the region touching the seed and drops the rest", () => {
  const art = `
    ##..##
    ##..##
    ......
    ###...`;
  assert.equal(fill(art, 0, 0), tidy(`
    ##....
    ##....
    ......
    ......`));
  assert.equal(fill(art, 5, 1), tidy(`
    ....##
    ....##
    ......
    ......`));
});

test("diagonal neighbours are not connected", () => {
  assert.equal(fill(`
    #.
    .#`, 0, 0), tidy(`
    #.
    ..`));
});

test("follows a winding region around corners and back up", () => {
  const maze = `
    #####.#
    ....#.#
    #.###.#
    #.#...#
    #.#####
    #......`;
  assert.equal(fill(maze, 0, 0), tidy(`
    #####.#
    ....#.#
    ..###.#
    ..#...#
    ..#####
    .......`));
});

test("a seed on an unselectable pixel, or outside, gives nothing", () => {
  assert.equal(fill("#.#", 1, 0), "...");
  assert.equal(fill("###", 7, 0), "...");
  assert.equal(fill("###", 0, -1), "...");
});

test("partial coverage is kept as it was", () => {
  const out = connectedRegion(Uint8ClampedArray.of(255, 90, 0, 255), 4, 1, 0, 0);
  assert.deepEqual([...out], [255, 90, 0, 0]);
});

test("agrees with a simple flood fill on random masks", () => {
  let seed = 3;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let round = 0; round < 30; round++) {
    const w = 3 + Math.floor(rnd() * 20), h = 3 + Math.floor(rnd() * 20);
    const mask = Uint8ClampedArray.from({ length: w * h }, () => (rnd() < 0.62 ? 255 : 0));
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    const expected = new Uint8ClampedArray(w * h);
    const queue = [[x, y]];
    while (queue.length) {
      const [qx, qy] = queue.pop();
      if (qx < 0 || qy < 0 || qx >= w || qy >= h || !mask[qy * w + qx] || expected[qy * w + qx]) continue;
      expected[qy * w + qx] = 255;
      queue.push([qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]);
    }
    assert.deepEqual([...connectedRegion(mask, w, h, x, y)], [...expected], `round ${round}`);
  }
});
