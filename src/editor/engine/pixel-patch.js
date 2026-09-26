// Captures and swaps rectangular pixel regions of a layer for undo/redo.
import { intersect, isEmptyRect, roundOut } from "./rect.js";

export function capturePatch(layer, rect) {
  const area = intersect(roundOut(rect), { x: 0, y: 0, w: layer.canvas.width, h: layer.canvas.height });
  if (isEmptyRect(area)) return null;
  const ctx = layer.canvas.getContext("2d");
  return { layerId: layer.id, rect: area, data: ctx.getImageData(area.x, area.y, area.w, area.h) };
}

// Writes the stored pixels and keeps the pixels they replaced.
export function swapPatch(patch, layer) {
  const ctx = layer.canvas.getContext("2d");
  const { x, y, w, h } = patch.rect;
  const current = ctx.getImageData(x, y, w, h);
  ctx.putImageData(patch.data, x, y);
  patch.data = current;
}

export const patchBytes = (patch) => patch.rect.w * patch.rect.h * 4;
