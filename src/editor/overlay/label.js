// Small dark tag near the pointer, e.g. "320 × 200" or "Threshold 42".
export function drawLabel(ctx, text, x, y) {
  ctx.save();
  ctx.font = "11px system-ui, -apple-system, Segoe UI, sans-serif";
  const w = ctx.measureText(text).width + 12;
  const bx = Math.min(x + 14, ctx.canvas.width / (window.devicePixelRatio || 1) - w - 4);
  const by = y + 16;
  ctx.fillStyle = "rgba(24,24,27,0.88)";
  ctx.beginPath();
  ctx.roundRect(bx, by, w, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + 6, by + 10);
  ctx.restore();
}
