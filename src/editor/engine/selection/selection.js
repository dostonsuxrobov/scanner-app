// An immutable selection: a document-sized mask plus derived data. Optional
// `shape` keeps rectangle selections editable with handles.
import { maskBounds } from "./mask-bounds.js";
import { maskOutline } from "./outline.js";
import { translateMask } from "./mask.js";

export function createSelection(mask, width, height, shape = null) {
  const bounds = maskBounds(mask, width, height);
  return { mask, width, height, bounds, count: bounds.count, shape, cache: {} };
}

export const selectionBytes = (selection) => (selection ? selection.mask.length * 5 : 0);

// Alpha canvas of the mask, used to clip pixel operations on the GPU.
export function selectionCanvas(selection) {
  const cache = selection.cache;
  if (!cache.canvas) {
    const { width, height, mask } = selection;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(width, height);
    const px = new Uint32Array(image.data.buffer);
    // Black with alpha = coverage (little-endian RGBA packs alpha in the top byte).
    for (let i = 0; i < mask.length; i++) px[i] = mask[i] << 24;
    ctx.putImageData(image, 0, 0);
    cache.canvas = canvas;
  }
  return cache.canvas;
}

export function selectionSegments(selection) {
  const cache = selection.cache;
  if (!cache.segments) cache.segments = maskOutline(selection.mask, selection.width, selection.height, selection.bounds);
  return cache.segments;
}

// Shifts a selection by whole pixels, clipping at the document edges.
export function translateSelection(selection, dx, dy) {
  const { mask, width, height, shape } = selection;
  const moved = translateMask(mask, width, height, dx, dy);
  const nextShape = shape ? { ...shape, rect: { ...shape.rect, x: shape.rect.x + dx, y: shape.rect.y + dy } } : null;
  return createSelection(moved, width, height, nextShape);
}
