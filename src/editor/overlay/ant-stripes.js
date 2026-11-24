// The black-and-white stripes marching ants are stroked with: 4 px black,
// 4 px white along one axis, moved on by one pixel per animation frame.
const PERIOD = 8;

// Whether the pixel at `position` along the axis is black in frame `phase`.
export const antIsBlack = (position, phase) => (((position - phase) % PERIOD) + PERIOD) % PERIOD < PERIOD / 2;

const tiles = new Map();

// A repeating pattern striped along `axis` ("x" or "y") for frame `phase`.
export function antStripes(ctx, axis, phase) {
  const key = axis + phase;
  let tile = tiles.get(key);
  if (!tile) {
    tile = document.createElement("canvas");
    tile.width = axis === "x" ? PERIOD : 1;
    tile.height = axis === "x" ? 1 : PERIOD;
    const t = tile.getContext("2d");
    for (let i = 0; i < PERIOD; i++) {
      t.fillStyle = antIsBlack(i, phase) ? "#000000" : "#ffffff";
      t.fillRect(axis === "x" ? i : 0, axis === "x" ? 0 : i, 1, 1);
    }
    tiles.set(key, tile);
  }
  return ctx.createPattern(tile, "repeat");
}
