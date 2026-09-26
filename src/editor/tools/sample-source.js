// Pixel data used for sampling: the merged image or the active layer, in
// document coordinates. Cached until the document changes.
import { flatten, layerInDocument } from "../engine/flatten.js";

export function createSampleSource() {
  let cache = null;
  return function sampleSource(rt, merged) {
    const { session } = rt;
    const layer = session.activeLayer;
    const key = `${session.version}|${merged}|${layer?.id}`;
    if (cache?.key !== key) {
      const doc = session.doc;
      const canvas = merged || !layer ? flatten(doc) : layerInDocument(doc, layer);
      const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, doc.width, doc.height).data;
      cache = { key, data, width: doc.width, height: doc.height };
    }
    return cache;
  };
}
