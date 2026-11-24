// Animated selection outline drawn in screen space, so it stays a crisp
// 1-px line at every zoom level.
const ANIMATE_LIMIT = 120_000;

// Very large outlines stay still: re-stroking them nine times a second would
// stall the editor.
export const antsAnimated = (segments) => segments.length / 4 <= ANIMATE_LIMIT;

// `view` includes the viewport's width and height (CSS pixels).
export function drawMarchingAnts(ctx, segments, view, phase) {
  if (!segments.length) return;
  const { zoom, x: ox, y: oy, width, height } = view;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < segments.length; i += 4) {
    const ax = Math.round(segments[i] * zoom + ox), ay = Math.round(segments[i + 1] * zoom + oy);
    const bx = Math.round(segments[i + 2] * zoom + ox), by = Math.round(segments[i + 3] * zoom + oy);
    // Segments are axis-aligned. Ones off screen or shorter than a pixel draw
    // nothing, so they are left out of the path.
    if ((ax === bx && ay === by) || Math.max(ax, bx) < 0 || Math.min(ax, bx) > width || Math.max(ay, by) < 0 || Math.min(ay, by) > height) continue;
    ctx.moveTo(ax + 0.5, ay + 0.5);
    ctx.lineTo(bx + 0.5, by + 0.5);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = antsAnimated(segments) ? -phase : 0;
  ctx.strokeStyle = "#000000";
  ctx.stroke();
  ctx.restore();
}

// Dashed outline for a rectangle being dragged, before it becomes a mask.
export function drawDashedPolygon(ctx, points, phase = 0) {
  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -phase;
  ctx.strokeStyle = "#000000";
  ctx.stroke();
  ctx.restore();
}
