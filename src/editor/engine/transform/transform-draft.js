// Pure model of a pending Scale/Rotate/Flip. The draft places the source
// (sourceW × sourceH) at centre (cx, cy), sized w × h, rotated by `angle`.
export const HANDLES = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
  se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
};

// `source` is the pixels to transform, placed at (x, y) in the document.
export function createDraft(layerId, source, x, y) {
  const w = source.width;
  const h = source.height;
  return {
    layerId,
    source,
    sourceW: w,
    sourceH: h,
    originX: x + w / 2,
    originY: y + h / 2,
    cx: x + w / 2,
    cy: y + h / 2,
    w,
    h,
    angle: 0,
    flipX: false,
    flipY: false,
  };
}

const rad = (deg) => (deg * Math.PI) / 180;

// Source pixel → document coordinates, as a canvas transform [a, b, c, d, e, f].
export function draftMatrix(d) {
  const cos = Math.cos(rad(d.angle));
  const sin = Math.sin(rad(d.angle));
  const sx = (d.w / d.sourceW) * (d.flipX ? -1 : 1);
  const sy = (d.h / d.sourceH) * (d.flipY ? -1 : 1);
  const a = cos * sx, b = sin * sx, c = -sin * sy, dd = cos * sy;
  const e = d.cx - a * (d.sourceW / 2) - c * (d.sourceH / 2);
  const f = d.cy - b * (d.sourceW / 2) - dd * (d.sourceH / 2);
  return [a, b, c, dd, e, f];
}

export function toLocal(d, p) {
  const cos = Math.cos(rad(-d.angle));
  const sin = Math.sin(rad(-d.angle));
  const x = p.x - d.cx, y = p.y - d.cy;
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function toDocument(d, p) {
  const cos = Math.cos(rad(d.angle));
  const sin = Math.sin(rad(d.angle));
  return { x: d.cx + p.x * cos - p.y * sin, y: d.cy + p.x * sin + p.y * cos };
}

export function draftCorners(d) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([hx, hy]) => toDocument(d, { x: (hx * d.w) / 2, y: (hy * d.h) / 2 }));
}

// Resizes by dragging a handle to `p`. The opposite side stays put unless
// `fromCenter`; `keepAspect` preserves the proportions of the start draft.
export function resizeDraft(start, handle, p, { keepAspect = false, fromCenter = false } = {}) {
  const [hx, hy] = HANDLES[handle];
  const local = toLocal(start, p);
  const fixedX = fromCenter ? 0 : (-hx * start.w) / 2;
  const fixedY = fromCenter ? 0 : (-hy * start.h) / 2;
  const span = (value, fixed, dir) => Math.max(1, fromCenter ? Math.abs(value) * 2 : (value - fixed) * dir);
  let w = hx ? span(local.x, fixedX, hx) : start.w;
  let h = hy ? span(local.y, fixedY, hy) : start.h;
  if (keepAspect) {
    const ratio = start.w / start.h;
    if (!hx) w = h * ratio;
    else if (!hy) h = w / ratio;
    else if (w / start.w > h / start.h) h = w / ratio;
    else w = h * ratio;
  }
  const centre = {
    x: fromCenter || !hx ? 0 : fixedX + (hx * w) / 2,
    y: fromCenter || !hy ? 0 : fixedY + (hy * h) / 2,
  };
  const c = toDocument(start, centre);
  return { ...start, w, h, cx: c.x, cy: c.y };
}

export function rotateDraft(start, from, to, snap = false) {
  const a0 = Math.atan2(from.y - start.cy, from.x - start.cx);
  const a1 = Math.atan2(to.y - start.cy, to.x - start.cx);
  let angle = start.angle + ((a1 - a0) * 180) / Math.PI;
  if (snap) angle = Math.round(angle / 15) * 15;
  return { ...start, angle: normalizeAngle(angle) };
}

export function normalizeAngle(angle) {
  const a = ((angle % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}

// Axis-aligned bounds of the transformed result in document coordinates.
export function draftBounds(d) {
  const pts = draftCorners(d);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.floor(Math.min(...xs) + 1e-6), y = Math.floor(Math.min(...ys) + 1e-6);
  return { x, y, w: Math.ceil(Math.max(...xs) - 1e-6) - x, h: Math.ceil(Math.max(...ys) - 1e-6) - y };
}

export const isIdentity = (d) =>
  d.angle === 0 && !d.flipX && !d.flipY && d.w === d.sourceW && d.h === d.sourceH && d.cx === d.originX && d.cy === d.originY;
