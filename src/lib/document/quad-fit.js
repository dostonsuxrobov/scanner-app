// Fits a quadrilateral to a region: convex hull, then the four hull points
// that enclose the largest area. Corners are returned clockwise from top-left.
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

// Boundary pixels of a region (a pixel with at least one outside neighbour).
export function regionBoundary(region, width, height) {
  const points = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!region[i]) continue;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1 || !region[i - 1] || !region[i + 1] || !region[i - width] || !region[i + width])
        points.push({ x: x + 0.5, y: y + 0.5 });
    }
  return points;
}

export const polygonArea = (pts) =>
  Math.abs(pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length];
    return s + p.x * q.y - q.x * p.y;
  }, 0)) / 2;

export function maxAreaQuad(hull) {
  // Thin the hull so the O(n³) search stays small; corners survive thinning.
  const step = Math.max(1, Math.ceil(hull.length / 90));
  const h = hull.filter((_, i) => i % step === 0);
  const n = h.length;
  if (n < 4) return null;
  const tri = (a, b, c) => Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  let best = null, bestArea = -1;
  for (let i = 0; i < n; i++)
    for (let k = i + 2; k < n; k++) {
      let left = -1, j = -1, right = -1, l = -1;
      for (let a = i + 1; a < k; a++) {
        const area = tri(h[i], h[a], h[k]);
        if (area > left) (left = area), (j = a);
      }
      for (let b = k + 1; b < n + i; b++) {
        const area = tri(h[i], h[k], h[b % n]);
        if (area > right) (right = area), (l = b % n);
      }
      if (j < 0 || l < 0 || l === i) continue;
      if (left + right > bestArea) {
        bestArea = left + right;
        best = [h[i], h[j], h[k], h[l]];
      }
    }
  return best && orderCorners(best);
}

// Orders four corners as top-left, top-right, bottom-right, bottom-left.
export function orderCorners(pts) {
  const c = { x: pts.reduce((s, p) => s + p.x, 0) / 4, y: pts.reduce((s, p) => s + p.y, 0) / 4 };
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
  // Clockwise in screen coordinates starting from the corner nearest the top-left.
  const start = sorted.reduce((bi, p, i) => (p.x + p.y < sorted[bi].x + sorted[bi].y ? i : bi), 0);
  return [0, 1, 2, 3].map((k) => sorted[(start + k) % 4]);
}
