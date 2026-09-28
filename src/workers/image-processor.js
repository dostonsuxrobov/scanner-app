// ============================================================
// image-processor.js — Web Worker
// ============================================================
import { applyPerspectiveTransform } from '../lib/document/perspective.js';
import { oneClickFix } from '../lib/document/one-click-fix.js';

// ---- SCAN STEP ----
// One incremental pass: desaturate to grayscale, then stretch
// the [black, white] range to [0, 255]. Repeated application
// pushes light pixels toward white and dark pixels toward black.

function scanStep(data, w, h) {
  const out = new Uint8ClampedArray(data.length);
  const black = 40;
  const white = 215;
  const range = white - black;
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
    let v = ((gray - black) / range) * 255;
    if (v < 0) v = 0;
    else if (v > 255) v = 255;
    out[j] = out[j + 1] = out[j + 2] = v;
    out[j + 3] = data[j + 3];
  }
  return out;
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

self.onmessage = function (e) {
  const { type, id, data } = e.data;
  try {
    if (type === 'scan') {
      const result = scanStep(data.imageData, data.width, data.height);
      self.postMessage({ id, success: true, result, width: data.width, height: data.height });
    } else if (type === 'transform') {
      const result = applyPerspectiveTransform(
        data.sourceData, data.sourceWidth, data.sourceHeight,
        data.srcPoints, data.outputWidth, data.outputHeight,
      );
      if (result) {
        self.postMessage({ id, success: true, result, width: data.outputWidth, height: data.outputHeight });
      } else {
        self.postMessage({ id, success: false, error: 'Transform failed — invalid polygon' });
      }
    } else if (type === 'oneClickFix') {
      const fixed = oneClickFix(data.imageData, data.width, data.height);
      self.postMessage({
        id, success: true, result: fixed.data, width: fixed.width, height: fixed.height,
        info: { straightened: fixed.straightened, paper: fixed.paper },
      }, [fixed.data.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};
