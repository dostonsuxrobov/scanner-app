// One-off flattened image of the document, e.g. for export or sampling.
import { createCanvas } from "./canvas.js";
import { drawLayers } from "./draw-layers.js";

// Layers are composited on transparency first so blend modes behave exactly as
// on screen; an optional background is placed underneath afterwards.
export function flatten(doc, { background = null } = {}) {
  const canvas = createCanvas(doc.width, doc.height);
  drawLayers(canvas.getContext("2d"), doc, { x: 0, y: 0, w: doc.width, h: doc.height });
  if (!background) return canvas;
  const flat = createCanvas(doc.width, doc.height);
  const ctx = flat.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, doc.width, doc.height);
  ctx.drawImage(canvas, 0, 0);
  return flat;
}

// Visible pixels of one layer placed in document coordinates.
export function layerInDocument(doc, layer) {
  const canvas = createCanvas(doc.width, doc.height);
  canvas.getContext("2d").drawImage(layer.canvas, layer.x, layer.y);
  return canvas;
}
