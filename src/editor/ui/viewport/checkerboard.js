// Screen-space checkerboard pattern that shows transparency.
let pattern = null;

export function checkerboard(ctx) {
  if (!pattern) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 16;
    const t = tile.getContext("2d");
    t.fillStyle = "#ffffff";
    t.fillRect(0, 0, 16, 16);
    t.fillStyle = "#e6e6e9";
    t.fillRect(0, 0, 8, 8);
    t.fillRect(8, 8, 8, 8);
    pattern = tile;
  }
  return ctx.createPattern(pattern, "repeat");
}
