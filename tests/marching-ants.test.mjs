import test from "node:test";
import assert from "node:assert/strict";

// The stripes are painted into tiny tile canvases; stand-ins record them.
globalThis.document = {
  createElement() {
    const tile = { pixels: [] };
    const paint = { fillRect: (x, y) => (tile.pixels[Math.max(x, y)] = paint.fillStyle === "#000000" ? 1 : 0) };
    tile.getContext = () => paint;
    return tile;
  },
};
const { antsAnimated, drawMarchingAnts } = await import("../src/editor/overlay/marching-ants.js");
const { antIsBlack } = await import("../src/editor/overlay/ant-stripes.js");

// Records the paths a drawing builds and what each one is stroked with.
function recorder() {
  const lines = [];
  let from = null, path = [];
  const ctx = { lines, strokes: [], save() {}, restore() {} };
  ctx.beginPath = () => (path = []);
  ctx.moveTo = (x, y) => (from = [x, y]);
  ctx.lineTo = (x, y) => (lines.push([...from, x, y]), path.push([...from, x, y]));
  ctx.createPattern = (tile, repeat) => ({ axis: tile.width > 1 ? "x" : "y", pixels: tile.pixels.join(""), repeat });
  ctx.stroke = () => ctx.strokes.push({ style: ctx.strokeStyle, lines: path });
  return ctx;
}

const view = (zoom, x = 0, y = 0) => ({ zoom, x, y, width: 200, height: 100 });
// Stripes of animation frame `phase`: "1" where a pixel is black.
const stripes = (phase) => Array.from({ length: 8 }, (_, i) => (antIsBlack(i, phase) ? 1 : 0)).join("");
// Whether a stroke paints the pixel at (x, y) black.
const black = (stroke, x, y) => stroke.style.pixels[(((stroke.style.axis === "x" ? x : y) % 8) + 8) % 8] === "1";

test("visible segments are drawn on pixel centres", () => {
  const ctx = recorder();
  drawMarchingAnts(ctx, Int32Array.of(10, 10, 50, 10, 50, 10, 50, 40), view(2, 5, 5), 3);
  assert.deepEqual(ctx.lines, [[25.5, 25.5, 105.5, 25.5], [105.5, 25.5, 105.5, 85.5]]);
  // Two strokes for the whole outline, however many segments it has: the
  // horizontal edges striped along x, the vertical ones along y, both in the
  // black-and-white of animation frame 3.
  assert.equal(ctx.strokes.length, 2);
  assert.deepEqual(ctx.strokes[0], { style: { axis: "x", pixels: stripes(3), repeat: "repeat" }, lines: [[25.5, 25.5, 105.5, 25.5]] });
  assert.deepEqual(ctx.strokes[1], { style: { axis: "y", pixels: stripes(3), repeat: "repeat" }, lines: [[105.5, 25.5, 105.5, 85.5]] });
  assert.equal(ctx.lineWidth, 1);
});

test("segments off screen or shorter than a pixel are left out", () => {
  const ctx = recorder();
  const segments = Int32Array.of(
    0, 0, 3, 0, // 0.3 px on screen
    500, 500, 900, 500, // visible
    500, 2000, 900, 2000, // below the viewport
    3000, 0, 3000, 500, // right of the viewport
    -900, 300, -100, 300, // left of the viewport
    700, 0, 700, 4, // 0.4 px on screen
  );
  drawMarchingAnts(ctx, segments, view(0.1), 0);
  assert.deepEqual(ctx.lines, [[50.5, 50.5, 90.5, 50.5]]);
});

test("very large outlines are not animated", () => {
  assert.equal(antsAnimated(new Int32Array(4 * 1000)), true);
  const large = new Int32Array(4 * 120_001);
  assert.equal(antsAnimated(large), false);
  // Whatever frame the animation is at, a large outline keeps frame 0's
  // stripes, so its cached rendering never has to be redone for the animation.
  for (const phase of [0, 5]) {
    const ctx = recorder();
    drawMarchingAnts(ctx, large, view(1), phase);
    assert.deepEqual(ctx.strokes.map((s) => s.style.pixels), [stripes(0), stripes(0)]);
  }
  // An outline small enough to animate does follow the frame.
  const ctx = recorder();
  drawMarchingAnts(ctx, new Int32Array(4 * 1000), view(1), 5);
  assert.deepEqual(ctx.strokes.map((s) => s.style.pixels), [stripes(5), stripes(5)]);
});

test("an ant is four pixels black, four white, and moves one pixel per frame", () => {
  assert.equal(stripes(0), "11110000");
  assert.equal(stripes(1), "01111000");
  assert.equal(stripes(7), "11100001");
  for (let phase = 0; phase < 8; phase++)
    for (let position = -9; position < 20; position++) assert.equal(antIsBlack(position + 1, phase + 1), antIsBlack(position, phase));
});

// A staircase of 1-px steps, as on a diagonal or curved edge: `rise` is -1 for
// an edge climbing to the right, +1 for one falling to the right.
function staircase(steps, rise) {
  const segments = [];
  let y = rise < 0 ? 60 : 10;
  for (let x = 20; x < 20 + steps; x++) {
    segments.push(x, y, x + 1, y); // one pixel along
    segments.push(x + 1, Math.min(y, y + rise), x + 1, Math.max(y, y + rise)); // one pixel up or down
    y += rise;
  }
  return Int32Array.from(segments);
}

test("the 1-px steps of a diagonal edge are never all black or all white together", () => {
  for (const rise of [-1, 1])
    for (let phase = 0; phase < 8; phase++) {
      const ctx = recorder();
      drawMarchingAnts(ctx, staircase(32, rise), view(1), phase);
      const [across, upright] = ctx.strokes;
      assert.equal(across.lines.length, 32);
      assert.equal(upright.lines.length, 32);
      // Colors of consecutive steps along the edge (a line starts at its pixel's centre).
      const along = across.lines.map(([x, y]) => black(across, Math.floor(x), Math.floor(y)));
      const up = upright.lines.map(([x, y]) => black(upright, Math.floor(x), Math.floor(y)));
      for (const colors of [along, up])
        for (let i = 0; i + 8 <= colors.length; i++) {
          const blacks = colors.slice(i, i + 8).filter(Boolean).length;
          assert.equal(blacks, 4, `rise ${rise}, frame ${phase}: 8 neighbouring steps have ${blacks} black`);
        }
    }
});

test("the pattern advances along the edge from one frame to the next", () => {
  for (const rise of [-1, 1]) {
    const frames = [0, 1, 2].map((phase) => {
      const ctx = recorder();
      drawMarchingAnts(ctx, staircase(32, rise), view(1), phase);
      return ctx.strokes[0].lines.map(([x, y]) => black(ctx.strokes[0], Math.floor(x), Math.floor(y)));
    });
    // Each step takes the color its left neighbour had one frame earlier.
    for (const [earlier, later] of [[frames[0], frames[1]], [frames[1], frames[2]]]) {
      assert.notDeepEqual(later, earlier);
      assert.deepEqual(later.slice(1), earlier.slice(0, -1));
    }
  }
});
