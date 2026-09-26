// Draws a rectangle or ellipse. Strokes sit inside the dragged box, so the
// shape never grows beyond what was drawn. Returns the painted bounds.
export function drawShape(ctx, kind, rect, { style, strokeWidth, radius = 0 }, colors) {
  const inset = style === "fill" ? 0 : Math.min(strokeWidth / 2, rect.w / 2, rect.h / 2);
  const x = rect.x + inset, y = rect.y + inset;
  const w = Math.max(0, rect.w - inset * 2), h = Math.max(0, rect.h - inset * 2);
  ctx.beginPath();
  if (kind === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
  if (style !== "stroke") {
    ctx.fillStyle = colors.fill;
    ctx.fill();
  }
  if (style !== "fill" && strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = "round";
    ctx.strokeStyle = colors.stroke;
    ctx.stroke();
  }
  return { x: rect.x - 1, y: rect.y - 1, w: rect.w + 2, h: rect.h + 2 };
}

// Fill uses the foreground color; with both, the outline uses the background.
export const shapeColors = (style, { fg, bg }) => ({ fill: fg, stroke: style === "both" ? bg : fg });
