// Dashed outline of the active layer where it does not match the image, like
// GIMP's yellow layer boundary. Shapes, pasted or moved pixels, and text sit
// on layers smaller than the image; painting only lands inside this outline.
export function drawLayerBoundary(ctx, layer, doc, view) {
  const { width, height } = layer.canvas;
  if (layer.x === 0 && layer.y === 0 && width === doc.width && height === doc.height) return;
  const x = Math.round(layer.x * view.zoom + view.x) + 0.5;
  const y = Math.round(layer.y * view.zoom + view.y) + 0.5;
  const w = Math.round(width * view.zoom);
  const h = Math.round(height * view.zoom);
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#18181b";
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#facc15";
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
