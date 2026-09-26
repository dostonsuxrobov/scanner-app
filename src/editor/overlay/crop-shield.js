// Darkens everything outside the crop box and draws composition guides.
export function drawCropShield(ctx, corners, viewportW, viewportH) {
  const [nw, , se] = corners;
  ctx.save();
  ctx.fillStyle = "rgba(15,15,18,0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, viewportW, viewportH);
  ctx.rect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
  ctx.fill("evenodd");
  ctx.restore();
}

export function drawCropGuides(ctx, corners, kind) {
  if (kind === "none") return;
  const [nw, , se] = corners;
  const w = se.x - nw.x, h = se.y - nw.y;
  const parts = kind === "grid" ? 6 : 3;
  ctx.save();
  ctx.beginPath();
  for (let i = 1; i < parts; i++) {
    const x = Math.round(nw.x + (w * i) / parts) + 0.5;
    const y = Math.round(nw.y + (h * i) / parts) + 0.5;
    ctx.moveTo(x, nw.y);
    ctx.lineTo(x, se.y);
    ctx.moveTo(nw.x, y);
    ctx.lineTo(se.x, y);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.stroke();
  ctx.restore();
}
