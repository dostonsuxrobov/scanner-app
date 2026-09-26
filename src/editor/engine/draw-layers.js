// Draws a document's visible layers into a context, limited to `region`
// (document coordinates). `live` swaps in previews for one layer:
//   paint:     { layerId, stroke }          stroke being drawn
//   replace:   { layerId, canvas, x, y }    pixels computed by a dialog/tool
//   transform: { layerId, source, matrix, smoothing }
//   hide:      layerId                      e.g. text being edited in place
//   insert:    { afterId, layer, stroke }   a new layer not yet in the document
import { applyStroke } from "./paint/apply-stroke.js";
import { createScratch } from "./canvas.js";
import { intersect, isEmptyRect } from "./rect.js";

const layerScratch = createScratch();

export function drawLayers(ctx, doc, region, live = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  if (live.insert && !live.insert.afterId) drawInserted(ctx, live.insert, region);
  for (const layer of doc.layers) {
    drawLayer(ctx, layer, live, region);
    if (live.insert?.afterId === layer.id) drawInserted(ctx, live.insert, region);
  }
  ctx.restore();
}

function drawLayer(ctx, layer, live, region) {
  if (!layer.visible || layer.opacity <= 0 || live.hide === layer.id) return;
  ctx.globalAlpha = layer.opacity / 100;
  ctx.globalCompositeOperation = layer.blend;
  if (live.transform?.layerId === layer.id) drawTransformed(ctx, live.transform);
  else if (live.replace?.layerId === layer.id) drawCanvas(ctx, live.replace.canvas, live.replace.x, live.replace.y, region);
  else if (live.paint?.layerId === layer.id) drawPainted(ctx, layer, live.paint.stroke, region);
  else drawCanvas(ctx, layer.canvas, layer.x, layer.y, region);
}

function drawInserted(ctx, insert, region) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  drawPainted(ctx, insert.layer, insert.stroke, region);
}

function drawCanvas(ctx, canvas, x, y, region) {
  const r = intersect(region, { x, y, w: canvas.width, h: canvas.height });
  if (isEmptyRect(r)) return;
  ctx.drawImage(canvas, r.x - x, r.y - y, r.w, r.h, r.x, r.y, r.w, r.h);
}

function drawTransformed(ctx, t) {
  ctx.save();
  ctx.imageSmoothingEnabled = t.smoothing;
  ctx.imageSmoothingQuality = "high";
  ctx.transform(...t.matrix);
  ctx.drawImage(t.source, 0, 0);
  ctx.restore();
}

// Composites the layer and its in-progress stroke in a scratch buffer first,
// so erasing and blend modes affect only this layer.
function drawPainted(ctx, layer, stroke, region) {
  const r = intersect(region, { x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height });
  if (isEmptyRect(r)) return;
  const local = { x: r.x - layer.x, y: r.y - layer.y, w: r.w, h: r.h };
  const { canvas, ctx: sctx } = layerScratch(r.w, r.h);
  sctx.drawImage(layer.canvas, local.x, local.y, r.w, r.h, 0, 0, r.w, r.h);
  applyStroke(sctx, local, stroke, local.x, local.y);
  ctx.drawImage(canvas, 0, 0, r.w, r.h, r.x, r.y, r.w, r.h);
}
