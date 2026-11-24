// Bakes a layer onto the one below it. The result covers both layers, so
// pixels lying outside the image (kept by a non-destructive crop, or moved
// off the edge) survive the merge.
import { createCanvas } from "./canvas.js";
import { drawLayers } from "./draw-layers.js";
import { layerBounds } from "./layer.js";
import { union } from "./rect.js";

export const mergedBounds = (bottom, top) => union(layerBounds(bottom), layerBounds(top));

// The top layer keeps its own opacity and blend mode while it is drawn; the
// bottom layer's are left to the merged layer, so the image looks the same.
export function mergeLayers(bottom, top) {
  const area = mergedBounds(bottom, top);
  const canvas = createCanvas(area.w, area.h);
  const ctx = canvas.getContext("2d");
  ctx.translate(-area.x, -area.y);
  const base = { ...bottom, visible: true, opacity: 100, blend: "source-over" };
  drawLayers(ctx, { layers: [base, top] }, area);
  return { canvas, x: area.x, y: area.y };
}
