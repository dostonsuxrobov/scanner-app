// Produces a layer's pixels after a pixel operation, blended through the
// selection. The same result drives both the live preview and the final apply.
import { createCanvas } from "../canvas.js";
import { selectionCanvas } from "../selection/selection.js";

// operation(data, width, height) mutates RGBA data in place.
export function filteredLayer(layer, operation, selection) {
  const { width, height } = layer.canvas;
  const image = layer.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height);
  const original = new Uint8ClampedArray(image.data);
  operation(image.data, width, height);
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
