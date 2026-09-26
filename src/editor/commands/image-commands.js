// Image menu: crop to selection and pixel adjustments on the active layer.
// Adjustments respect the selection, including soft (feathered) edges.
import { cropDocument } from "../engine/crop-document.js";
import { filteredLayer } from "../engine/adjust/filtered-layer.js";
import { adjustColors, desaturate, invertColors } from "../engine/adjust/color-adjust.js";
import { gaussianBlur } from "../engine/adjust/gaussian-blur.js";
import { layerBounds } from "../engine/layer.js";
import { editableLayer } from "../tools/helpers/editable-layer.js";
import { fitToScreen } from "./view-commands.js";
import { settle } from "./settle.js";

export const adjustmentOperation = (values) => (data) => adjustColors(data, values);
export const blurOperation = (radius) => (data, width, height) => gaussianBlur(data, width, height, radius);

export function applyLayerOperation(rt, label, operation) {
  if (!settle(rt)) return;
  const layer = editableLayer(rt);
  if (!layer) return;
  const selection = rt.session.selection;
  if (selection && !selection.count) return rt.toast("The selection is empty.", true);
  const result = filteredLayer(layer, operation, selection);
  rt.session.edit(
    label,
    () => {
      const ctx = layer.canvas.getContext("2d");
      ctx.clearRect(0, 0, result.width, result.height);
      ctx.drawImage(result, 0, 0);
    },
    [[layer, { x: 0, y: 0, w: result.width, h: result.height }]],
  );
  rt.setLive(null, layerBounds(layer));
}

// Shows the operation's result on the active layer without changing it.
export function previewLayerOperation(rt, operation) {
  const layer = rt.session.activeLayer;
  if (!layer) return;
  const canvas = filteredLayer(layer, operation, rt.session.selection);
  rt.setLive({ replace: { layerId: layer.id, canvas, x: layer.x, y: layer.y } }, layerBounds(layer));
}

// Removes only a preview made by previewLayerOperation.
export function endPreview(rt) {
  const replaced = rt.live.replace;
  if (!replaced) return;
  const layer = rt.session.layer(replaced.layerId);
  rt.setLive(null, layer ? layerBounds(layer) : null);
}

export const desaturateLayer = (rt) => applyLayerOperation(rt, "Desaturate", desaturate);
export const invertLayer = (rt) => applyLayerOperation(rt, "Invert colors", invertColors);

export function cropToSelection(rt) {
  const { session } = rt;
  const selection = session.selection;
  if (!selection?.count) return rt.toast("Make a selection first.", true);
  if (!settle(rt)) return;
  const locked = session.doc.layers.find((l) => l.locked);
  if (locked) return rt.toast(`Unlock “${locked.name}” before cropping.`, true);
  session.edit("Crop to selection", (doc) => {
    cropDocument(doc, selection.bounds, { deletePixels: true });
    session.selection = null;
  });
  fitToScreen(rt);
}
