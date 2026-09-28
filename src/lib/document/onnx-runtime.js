// Loads ONNX Runtime Web (WebAssembly) on demand, served from this site.
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

let runtime = null;

export function loadRuntime() {
  runtime ??= import("onnxruntime-web/wasm").then((ort) => {
    ort.env.wasm.wasmPaths = { wasm: wasmUrl };
    // Threads need cross-origin isolation, which static hosting doesn't give.
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    return ort;
  });
  return runtime;
}
