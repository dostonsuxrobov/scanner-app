// Produces a layer's pixels after a pixel operation, blended through the
// selection. The same result drives both the live preview and the final apply.
import { createCanvas } from "../canvas.js";
import { maskWindow } from "../selection/mask.js";
import { selectionCanvas } from "../selection/selection.js";

// operation(data, width, height, coverage) mutates RGBA data in place.
// coverage() gives the selection as the layer sees it (one byte per pixel, or
// null without a selection), for operations that measure the image first.
export function filteredLayer(layer, operation, selection) {
  const { width, height } = layer.canvas;
  const image = layer.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height);
  const original = new Uint8ClampedArray(image.data);
  const coverage = () => (selection ? maskWindow(selection.mask, selection.width, selection.height, layer.x, layer.y, width, height) : null);
  operation(image.data, width, height, coverage);
  if (layer.alphaLocked) for (let p = 3; p < original.length; p += 4) image.data[p] = original[p];
  const result = createCanvas(width, height);
  const ctx = result.getContext("2d");
  if (!selection) {
    ctx.putImageData(image, 0, 0);
    return result;
  }
  // result = original·(1 − m) + filtered·m, composited in premultiplied space.
  const filtered = createCanvas(width, height);
  const fctx = filtered.getContext("2d");
  fctx.putImageData(image, 0, 0);
  fctx.globalCompositeOperation = "destination-in";
  fctx.drawImage(selectionCanvas(selection), -layer.x, -layer.y);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(selectionCanvas(selection), -layer.x, -layer.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(filtered, 0, 0);
  return result;
}
