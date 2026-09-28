// Geometry of a page's four corners (TL, TR, BR, BL) within a photo.

// Pulls the corners toward the centre by a share of the page's size.
export function inset(corners, amount) {
  const cx = corners.reduce((s, p) => s + p.x, 0) / 4;
  const cy = corners.reduce((s, p) => s + p.y, 0) / 4;
  return corners.map((p) => ({ x: p.x + (cx - p.x) * amount * 2, y: p.y + (cy - p.y) * amount * 2 }));
}

function bounds(corners) {
  const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// The corners' bounding box grown by `margin` of its size, clipped to the photo.
export function regionAround(corners, width, height, margin) {
  const b = bounds(corners);
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const x0 = Math.max(0, Math.floor(b.x0 - w * margin));
  const y0 = Math.max(0, Math.floor(b.y0 - h * margin));
  const x1 = Math.min(width, Math.ceil(b.x1 + w * margin));
  const y1 = Math.min(height, Math.ceil(b.y1 + h * margin));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Share of the photo covered by the corners' bounding box.
export function boundsShare(corners, width, height) {
  const b = bounds(corners);
  return ((b.x1 - b.x0) * (b.y1 - b.y0)) / (width * height);
}

// Whether two quads mark the same page: every corner within `tolerance` of
// the page's diagonal.
export function sameQuad(a, b, tolerance) {
  const b0 = bounds(b);
  const limit = Math.hypot(b0.x1 - b0.x0, b0.y1 - b0.y0) * tolerance;
  return a.every((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) <= limit);
}
