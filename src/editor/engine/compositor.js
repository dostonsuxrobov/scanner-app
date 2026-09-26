// Keeps a flattened copy of the document and refreshes only damaged areas.
import { createCanvas } from "./canvas.js";
import { drawLayers } from "./draw-layers.js";
import { intersect, isEmptyRect, roundOut, union } from "./rect.js";

export function createCompositor() {
  let canvas = null;
  let damage = null; // pending rect, or "all"

  return {
    get canvas() {
      return canvas;
    },
    invalidate(rect) {
      if (!rect || damage === "all") damage = "all";
      else damage = damage ? union(damage, roundOut(rect)) : roundOut(rect);
    },
    // Brings the composite up to date and returns it (null without a document).
    update(doc, live) {
      if (!doc) return (canvas = null);
      if (!canvas || canvas.width !== doc.width || canvas.height !== doc.height) {
        canvas = createCanvas(doc.width, doc.height);
        damage = "all";
      }
      if (!damage) return canvas;
      const full = { x: 0, y: 0, w: doc.width, h: doc.height };
      const region = damage === "all" ? full : intersect(damage, full);
      damage = null;
      if (isEmptyRect(region)) return canvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(region.x, region.y, region.w, region.h);
      drawLayers(ctx, doc, region, live);
      return canvas;
    },
  };
}
