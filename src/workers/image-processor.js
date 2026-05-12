// ============================================================
// image-processor.js — Web Worker
// ============================================================

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
// PERSPECTIVE TRANSFORM (used by crop tool)
// ============================================================

function solveLinearSystem(A, b) {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) return null;
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    x[row] = aug[row][n];
    for (let col = row + 1; col < n; col++) x[row] -= aug[row][col] * x[col];
    x[row] /= aug[row][row];
  }
  return x;
}

function computePerspectiveTransform(srcPts, dstPts) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const s = srcPts[i], d = dstPts[i];
    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    b.push(d.x);
    b.push(d.y);
  }
  return solveLinearSystem(A, b);
}

function applyPerspectiveTransform(sourceData, sw, sh, srcPts, ow, oh) {
  const dstPts = [{ x: 0, y: 0 }, { x: ow, y: 0 }, { x: ow, y: oh }, { x: 0, y: oh }];
  const H = computePerspectiveTransform(dstPts, srcPts);
  if (!H) return null;

  const dest = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const denom = H[6] * x + H[7] * y + 1;
      if (Math.abs(denom) < 1e-10) continue;
      const srcX = (H[0] * x + H[1] * y + H[2]) / denom;
      const srcY = (H[3] * x + H[4] * y + H[5]) / denom;
      const x0 = srcX | 0, y0 = srcY | 0;

      if (x0 >= 0 && x0 + 1 < sw && y0 >= 0 && y0 + 1 < sh) {
        const fx = srcX - x0, fy = srcY - y0;
        for (let c = 0; c < 4; c++) {
          const v00 = sourceData[(y0 * sw + x0) * 4 + c];
          const v10 = sourceData[(y0 * sw + x0 + 1) * 4 + c];
          const v01 = sourceData[((y0 + 1) * sw + x0) * 4 + c];
          const v11 = sourceData[((y0 + 1) * sw + x0 + 1) * 4 + c];
          dest[(y * ow + x) * 4 + c] =
            v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy;
        }
      } else {
        const idx = (y * ow + x) * 4;
        dest[idx] = dest[idx + 1] = dest[idx + 2] = dest[idx + 3] = 255;
      }
    }
  }
  return dest;
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
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};
