// Outline of the brush footprint under the pointer.
export function drawBrushCursor(ctx, sx, sy, diameterPx) {
  ctx.save();
  const r = diameterPx / 2;
  if (r >= 3) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.stroke();
  }
  // A small crosshair keeps tiny brushes visible.
  if (r < 8) {
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy + 0.5);
    ctx.lineTo(sx + 7, sy + 0.5);
    ctx.moveTo(sx + 0.5, sy - 6);
    ctx.lineTo(sx + 0.5, sy + 7);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }
  ctx.restore();
}
