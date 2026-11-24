// Fills a layer with one color, through a selection if there is one (soft
// edges included). A transparency-locked layer is only recolored.
import { createCanvas } from "../canvas.js";
import { selectionCanvas } from "../selection/selection.js";

export function fillLayer(layer, color, selection) {
  const { width, height } = layer.canvas;
  const paint = createCanvas(width, height);
  const pctx = paint.getContext("2d");
  pctx.fillStyle = color;
  pctx.fillRect(0, 0, width, height);
  if (selection) {
    pctx.globalCompositeOperation = "destination-in";
    pctx.drawImage(selectionCanvas(selection), -layer.x, -layer.y);
  }
  const ctx = layer.canvas.getContext("2d");
  ctx.save();
  ctx.globalCompositeOperation = layer.alphaLocked ? "source-atop" : "source-over";
  ctx.drawImage(paint, 0, 0);
  ctx.restore();
}
