// Returns the active layer if it can take a pixel edit, explaining why not
// otherwise. Text layers are converted to pixels first, as in Photoshop.
import { isTextLayer } from "../../engine/layer.js";

export function editableLayer(rt, { alpha = false, rasterize = true } = {}) {
  const layer = rt.session.activeLayer;
  const blocker = rt.session.editBlocker(layer, { alpha });
  if (blocker) {
    rt.toast(blocker, true);
    return null;
  }
  if (rasterize && isTextLayer(layer)) rasterizeText(rt, layer);
  return rt.session.activeLayer;
}

export function rasterizeText(rt, layer) {
  rt.session.edit("Rasterize text", () => {
    layer.text = null;
  });
  rt.toast(`“${layer.name}” is now a pixel layer; its text is no longer editable.`);
}
