// Crops the document to `rect` (which may extend past the canvas to enlarge
// it). With `deletePixels`, layer pixels outside are discarded; otherwise
// layers keep them and can be moved back into view later.
import { createCanvas } from "./canvas.js";
import { intersect, isEmptyRect } from "./rect.js";
import { moveLayerTo } from "./layer.js";
import { fitsLimits, limitsMessage } from "./limits.js";

// The crop rect that gives the image a new size. `anchor` says which part
// stays put: x and y are each 0 (left/top), 0.5 (centre) or 1 (right/bottom).
export const canvasSizeRect = (doc, width, height, anchor) => ({
  x: 0 - Math.round((width - doc.width) * anchor.x),
  y: 0 - Math.round((height - doc.height) * anchor.y),
  w: width,
  h: height,
});

export function cropDocument(doc, rect, { deletePixels = true } = {}) {
  // Checked before anything changes: an oversized canvas cannot be displayed,
  // and its project file could not be opened again.
  if (!fitsLimits(rect.w, rect.h)) throw new Error(`The image would be too large. ${limitsMessage()}`);
  for (const layer of doc.layers) {
    if (deletePixels && !layer.text) {
      const keep = intersect(rect, { x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height });
      const canvas = createCanvas(Math.max(1, keep.w), Math.max(1, keep.h));
      if (!isEmptyRect(keep))
        canvas.getContext("2d").drawImage(layer.canvas, keep.x - layer.x, keep.y - layer.y, keep.w, keep.h, 0, 0, keep.w, keep.h);
      layer.canvas = canvas;
      layer.x = isEmptyRect(keep) ? 0 : keep.x - rect.x;
      layer.y = isEmptyRect(keep) ? 0 : keep.y - rect.y;
    } else moveLayerTo(layer, layer.x - rect.x, layer.y - rect.y);
  }
  doc.width = rect.w;
  doc.height = rect.h;
}
