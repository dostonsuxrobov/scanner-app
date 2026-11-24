// Paints the marching ants, reusing the last rendering of a large outline.
// The overlay is repainted on every pointer event; an outline with hundreds
// of thousands of segments (Select by Color on a scanned page) is stroked
// again only when the outline, the view, or the animation phase changes.
import { antsAnimated, drawMarchingAnts } from "./marching-ants.js";

// Below this many segments stroking directly is cheaper than keeping a copy.
const CACHE_FROM = 4000 * 4;

export function createAntsLayer() {
  let canvas = null;
  let drawn = null; // the outline last rendered, held weakly so it can be freed
  let key = [];

  return function paintAnts(ctx, segments, view, phase, dpr) {
    if (segments.length < CACHE_FROM) return drawMarchingAnts(ctx, segments, view, phase);
    const next = [view.zoom, view.x, view.y, view.width, view.height, dpr, antsAnimated(segments) ? phase : 0];
    if (drawn?.deref() !== segments || next.some((value, i) => value !== key[i])) {
      canvas ??= document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(view.width * dpr)); // also clears it
      canvas.height = Math.max(1, Math.round(view.height * dpr));
      const own = canvas.getContext("2d");
      own.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMarchingAnts(own, segments, view, phase);
      drawn = new WeakRef(segments);
      key = next;
    }
    ctx.drawImage(canvas, 0, 0, view.width, view.height);
  };
}
