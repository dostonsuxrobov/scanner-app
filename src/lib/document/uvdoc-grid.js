// UVDoc's output grid: for each of GRID_ROWS × GRID_COLS points of the
// flattened page, where it lies in the input region, as coordinates in
// [-1, 1] (align_corners). Channel 0 holds x, channel 1 holds y.
export const GRID_ROWS = 45;
export const GRID_COLS = 31;

// Converts the raw grid to photo pixels: [{ x, y }] row-major.
export function gridToPixels(grid, region) {
  const n = GRID_ROWS * GRID_COLS;
  const points = new Array(n);
  for (let i = 0; i < n; i++)
    points[i] = {
      x: region.x + ((grid[i] + 1) / 2) * (region.w - 1),
      y: region.y + ((grid[n + i] + 1) / 2) * (region.h - 1),
    };
  return points;
}

export const gridPoint = (points, row, col) => points[row * GRID_COLS + col];

export const gridCorners = (points) => [
  gridPoint(points, 0, 0),
  gridPoint(points, 0, GRID_COLS - 1),
  gridPoint(points, GRID_ROWS - 1, GRID_COLS - 1),
  gridPoint(points, GRID_ROWS - 1, 0),
];
