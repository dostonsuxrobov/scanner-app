// Eight resize handles around a (possibly rotated) box, in screen space.
export const HANDLE_KEYS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// corners: screen points in order nw, ne, se, sw.
export function handlePoints(corners) {
  const [nw, ne, se, sw] = corners;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  return { nw, n: mid(nw, ne), ne, e: mid(ne, se), se, s: mid(se, sw), sw, w: mid(sw, nw) };
}

export function rectCorners(rect, view) {
  const x0 = rect.x * view.zoom + view.x;
  const y0 = rect.y * view.zoom + view.y;
  const x1 = (rect.x + rect.w) * view.zoom + view.x;
  const y1 = (rect.y + rect.h) * view.zoom + view.y;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function drawHandles(ctx, points, size = 8) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 1;
  for (const key of HANDLE_KEYS) {
    const p = points[key];
    ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    ctx.strokeRect(Math.round(p.x - size / 2) + 0.5, Math.round(p.y - size / 2) + 0.5, size - 1, size - 1);
  }
  ctx.restore();
}

// Nearest handle within `tolerance` screen pixels, or null.
export function hitHandle(points, sx, sy, tolerance = 9) {
  let best = null;
  let bestDistance = tolerance;
  for (const key of HANDLE_KEYS) {
    const d = Math.hypot(points[key].x - sx, points[key].y - sy);
    if (d <= bestDistance) {
      best = key;
      bestDistance = d;
    }
  }
  return best;
}

export function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// CSS cursor for a handle, accounting for the box's rotation.
export function handleCursor(handle, angle = 0) {
  const base = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 }[handle];
  const a = (((base + angle) % 180) + 180) % 180;
  return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][Math.round(a / 45) % 4];
}

export function strokeOutline(ctx, points, color = "#1d4ed8") {
  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}
