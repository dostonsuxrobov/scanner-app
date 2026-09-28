// Measurements of a page grid (in photo pixels): how far it is from a flat
// plane, and how long its rows and columns are along the paper.
import { computePerspectiveTransform } from "./perspective.js";
import { GRID_COLS, GRID_ROWS, gridCorners, gridPoint } from "./uvdoc-grid.js";

// Root-mean-square distance (px) between the grid and the flat perspective
// plane through its four corners. Near zero means the page is flat.
export function curvature(points) {
  const unit = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const H = computePerspectiveTransform(unit, gridCorners(points));
  if (!H) return Infinity;
  let sum = 0;
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) {
      const u = c / (GRID_COLS - 1), v = r / (GRID_ROWS - 1);
      const d = H[6] * u + H[7] * v + 1;
      const p = gridPoint(points, r, c);
      sum += (p.x - (H[0] * u + H[1] * v + H[2]) / d) ** 2 + (p.y - (H[3] * u + H[4] * v + H[5]) / d) ** 2;
    }
  return Math.sqrt(sum / (GRID_ROWS * GRID_COLS));
}

const polyline = (pts) => pts.slice(1).reduce((len, p, i) => len + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);

// Mean length (px) of the page's rows (width) and columns (height), measured
// along the paper's surface, so curls don't shorten them.
export function surfaceLengths(points) {
  let width = 0, height = 0;
  for (let r = 0; r < GRID_ROWS; r++) width += polyline(Array.from({ length: GRID_COLS }, (_, c) => gridPoint(points, r, c)));
  for (let c = 0; c < GRID_COLS; c++) height += polyline(Array.from({ length: GRID_ROWS }, (_, r) => gridPoint(points, r, c)));
  return { width: width / GRID_ROWS, height: height / GRID_COLS };
}
