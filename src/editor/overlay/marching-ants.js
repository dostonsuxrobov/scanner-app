// Animated selection outline drawn in screen space, so it stays a crisp
// 1-px line at every zoom level.
const ANIMATE_LIMIT = 120_000;

export function drawMarchingAnts(ctx, segments, view, phase) {
  if (!segments.length) return;
  const { zoom, x: ox, y: oy } = view;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < segments.length; i += 4) {
    ctx.moveTo(Math.round(segments[i] * zoom + ox) + 0.5, Math.round(segments[i + 1] * zoom + oy) + 0.5);
    ctx.lineTo(Math.round(segments[i + 2] * zoom + ox) + 0.5, Math.round(segments[i + 3] * zoom + oy) + 0.5);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = segments.length / 4 > ANIMATE_LIMIT ? 0 : -phase;
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
