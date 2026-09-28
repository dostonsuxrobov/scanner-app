// The UVDoc page-unwarping network: loads once, then predicts a page grid
// for a region of a photo.
import { fetchModel } from "./model-cache.js";
import { loadRuntime } from "./onnx-runtime.js";
import { uvdocInput, UVDOC_HEIGHT, UVDOC_WIDTH } from "./uvdoc-input.js";
import { gridToPixels } from "./uvdoc-grid.js";

let session = null;

function loadSession(modelUrl, onProgress) {
  session ??= Promise.all([loadRuntime(), fetchModel(modelUrl, onProgress)])
    .then(([ort, bytes]) => ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" }).then((s) => ({ ort, s })))
    .catch((error) => {
      session = null; // allow a retry, e.g. once back online
      throw error;
    });
  return session;
}

// Returns predictGrid(region) for oneClickFix, bound to one image.
export function uvdocPredictor(data, width, height, { modelUrl, onProgress }) {
  return async (region) => {
    const { ort, s } = await loadSession(modelUrl, onProgress);
    const input = new ort.Tensor("float32", uvdocInput(data, width, height, region), [1, 3, UVDOC_HEIGHT, UVDOC_WIDTH]);
    const { grid } = await s.run({ image: input });
    return gridToPixels(grid.data, region);
  };
}
