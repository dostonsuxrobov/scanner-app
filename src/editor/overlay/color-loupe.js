// Ring near the pointer comparing the sampled color (top) with the current one.
export function drawColorLoupe(ctx, sx, sy, next, current) {
  const r = 34;
  ctx.save();
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(sx, sy, r, Math.PI, 0);
  ctx.strokeStyle = next;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI);
  ctx.strokeStyle = current;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(sx, sy, r + 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, r - 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
