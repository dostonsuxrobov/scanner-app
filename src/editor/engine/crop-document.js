// Crops the document to `rect` (which may extend past the canvas to enlarge
// it). With `deletePixels`, layer pixels outside are discarded; otherwise
// layers keep them and can be moved back into view later.
import { createCanvas } from "./canvas.js";
import { intersect, isEmptyRect } from "./rect.js";

export function cropDocument(doc, rect, { deletePixels = true } = {}) {
  for (const layer of doc.layers) {
    if (deletePixels && !layer.text) {
      const keep = intersect(rect, { x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height });
      const canvas = createCanvas(Math.max(1, keep.w), Math.max(1, keep.h));
      if (!isEmptyRect(keep))
        canvas.getContext("2d").drawImage(layer.canvas, keep.x - layer.x, keep.y - layer.y, keep.w, keep.h, 0, 0, keep.w, keep.h);
      layer.canvas = canvas;
      layer.x = isEmptyRect(keep) ? 0 : keep.x - rect.x;
      layer.y = isEmptyRect(keep) ? 0 : keep.y - rect.y;
    } else {
      layer.x -= rect.x;
      layer.y -= rect.y;
      if (layer.text) layer.text = { ...layer.text, anchor: { x: layer.text.anchor.x - rect.x, y: layer.text.anchor.y - rect.y } };
    }
  }
  doc.width = rect.w;
  doc.height = rect.h;
}
