// Cuts the selected pixels of `layer` into a new layer directly above it.
// Call inside a transaction that has captured `pixelRect(...)` of the layer.
import { createCanvas } from "../../engine/canvas.js";
import { createLayer, layerBounds } from "../../engine/layer.js";
import { intersect, isEmptyRect } from "../../engine/rect.js";
import { selectionCanvas } from "../../engine/selection/selection.js";

// Region of the layer (layer coordinates) the lift will modify.
export function liftRect(layer, selection) {
  const b = intersect(selection.bounds, layerBounds(layer));
  return { x: b.x - layer.x, y: b.y - layer.y, w: b.w, h: b.h };
}

export function liftSelection(doc, layer, selection, { cut = true, name } = {}) {
  const b = intersect(selection.bounds, layerBounds(layer));
  if (isEmptyRect(b)) return null;
  const mask = selectionCanvas(selection);
  const piece = createCanvas(b.w, b.h);
  const pctx = piece.getContext("2d");
  pctx.drawImage(layer.canvas, layer.x - b.x, layer.y - b.y);
  pctx.globalCompositeOperation = "destination-in";
  pctx.drawImage(mask, -b.x, -b.y);
  if (cut) {
    const ctx = layer.canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(mask, -layer.x, -layer.y);
    ctx.restore();
  }
  const floating = createLayer(name ?? `${layer.name} (selection)`, piece, { x: b.x, y: b.y });
  doc.layers.splice(doc.layers.indexOf(layer) + 1, 0, floating);
  doc.activeId = floating.id;
  return floating;
}
