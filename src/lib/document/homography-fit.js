// Least-squares homography through many point pairs: the flat plane that
// best explains all of them, not just four.
//
// Solves for h in  x' = (h0 x + h1 y + h2) / (h6 x + h7 y + 1), likewise y',
// through the normal equations of the linearised system. Target coordinates
// are centred and scaled first so the system stays well conditioned.
import { solveLinearSystem } from "./perspective.js";

// from, to: [{ x, y }] of equal length (at least four pairs).
// Returns project({ x, y }) → { x, y } in `to` coordinates, or null.
export function fitHomography(from, to) {
  const n = to.length;
  const cx = to.reduce((s, p) => s + p.x, 0) / n, cy = to.reduce((s, p) => s + p.y, 0) / n;
  const size = Math.max(1e-9, Math.sqrt(to.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) / n));
  const A = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const b = new Array(8).fill(0);
  const add = (row, value) => {
    for (let i = 0; i < 8; i++) {
      b[i] += row[i] * value;
      for (let j = 0; j < 8; j++) A[i][j] += row[i] * row[j];
    }
  };
  for (let k = 0; k < n; k++) {
    const { x, y } = from[k];
    const X = (to[k].x - cx) / size, Y = (to[k].y - cy) / size;
    add([x, y, 1, 0, 0, 0, -X * x, -X * y], X);
    add([0, 0, 0, x, y, 1, -Y * x, -Y * y], Y);
  }
  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return ({ x, y }) => {
    const d = h[6] * x + h[7] * y + 1;
    return { x: cx + (size * (h[0] * x + h[1] * y + h[2])) / d, y: cy + (size * (h[3] * x + h[4] * y + h[5])) / d };
  };
}
