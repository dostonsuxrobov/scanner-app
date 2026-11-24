// Measurements of a page grid (in photo pixels): how far it is from a flat
// plane, and how long its rows and columns are along the paper.
import { fitHomography } from "./homography-fit.js";
import { GRID_COLS, GRID_ROWS, gridPoint } from "./uvdoc-grid.js";

// Root-mean-square distance (px) between the grid and the flat perspective
// plane that fits all of its points best. Near zero means the page is flat.
// (A plane through the four corner points alone would carry the corners'
// own error, and the corners are the grid's least reliable points.)
export function curvature(points) {
  const flat = [];
  for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) flat.push({ x: c / (GRID_COLS - 1), y: r / (GRID_ROWS - 1) });
  const project = fitHomography(flat, points);
  if (!project) return Infinity;
  let sum = 0;
  for (let i = 0; i < flat.length; i++) {
    const q = project(flat[i]);
    sum += (points[i].x - q.x) ** 2 + (points[i].y - q.y) ** 2;
  }
  return Math.sqrt(sum / flat.length);
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
