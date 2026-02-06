// ============================================================
// image-processor.js — Web Worker
// Each function does ONE thing. Composed into pipelines at the end.
// ============================================================

// ---- INTEGRAL IMAGES (the shared speedup trick) ----
// An integral image lets you compute the sum of any rectangular
// region in O(1) instead of O(window²). We build two: one for
// the values and one for the squared values (needed by Sauvola).

function buildIntegralImages(gray, w, h) {
  const sum = new Float64Array(w * h);
  const sqSum = new Float64Array(w * h);

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSqSum = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = gray[i];
      rowSum += v;
      rowSqSum += v * v;
      sum[i] = rowSum + (y > 0 ? sum[i - w] : 0);
      sqSum[i] = rowSqSum + (y > 0 ? sqSum[i - w] : 0);
    }
  }
  return { sum, sqSum };
}

// Query a rectangular region from an integral image in O(1)
function integralQuery(img, w, x1, y1, x2, y2) {
  const d = img[y2 * w + x2];
  const a = x1 > 0 && y1 > 0 ? img[(y1 - 1) * w + (x1 - 1)] : 0;
  const b = y1 > 0 ? img[(y1 - 1) * w + x2] : 0;
  const c = x1 > 0 ? img[y2 * w + (x1 - 1)] : 0;
  return d - b - c + a;
}

// ---- CONVERT TO GRAYSCALE ----

function toGrayscale(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    gray[i] = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
  }
  return gray;
}

// ---- SEPARABLE BOX BLUR ----
// 3 passes of box blur ≈ Gaussian blur. Separable = O(n) regardless
// of radius. A 40px blur costs the same as a 3px blur.

function boxBlurH(src, dst, w, h, r) {
  const diameter = r + r + 1;
  const invD = 1.0 / diameter;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = src[row] * (r + 1);
    for (let x = 0; x < r; x++) acc += src[row + x];
    for (let x = 0; x < w; x++) {
      acc += src[row + Math.min(x + r, w - 1)];
      dst[row + x] = acc * invD;
      acc -= src[row + Math.max(x - r, 0)];
    }
  }
}

function boxBlurV(src, dst, w, h, r) {
  const diameter = r + r + 1;
  const invD = 1.0 / diameter;
  for (let x = 0; x < w; x++) {
    let acc = src[x] * (r + 1);
    for (let y = 0; y < r; y++) acc += src[y * w + x];
    for (let y = 0; y < h; y++) {
      acc += src[Math.min(y + r, h - 1) * w + x];
      dst[y * w + x] = acc * invD;
      acc -= src[Math.max(y - r, 0) * w + x];
    }
  }
}

function gaussianApproxBlur(data, w, h, radius) {
  const temp = new Float32Array(w * h);
  // 3 passes of box blur approximates a Gaussian
  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(data, temp, w, h, radius);
    boxBlurV(temp, data, w, h, radius);
  }
}

// ---- MAX FILTER (1D horizontal + vertical for speed) ----
// Used for morphological background estimation

function maxFilterH(src, dst, w, h, r) {
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let mx = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let xx = x0; xx <= x1; xx++) {
        if (src[row + xx] > mx) mx = src[row + xx];
      }
      dst[row + x] = mx;
    }
  }
}

function maxFilterV(src, dst, w, h, r) {
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let mx = 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let yy = y0; yy <= y1; yy++) {
        if (src[yy * w + x] > mx) mx = src[yy * w + x];
      }
      dst[y * w + x] = mx;
    }
  }
}

// ---- MORPHOLOGICAL BACKGROUND ESTIMATION ----
// Dilate (max filter) then smooth. Produces a clean background
// without block artifacts.

function estimateBackground(gray, w, h) {
  const radius = Math.max(20, Math.floor(Math.min(w, h) / 20));
  const blurRadius = Math.max(10, Math.floor(radius / 2));

  const temp = new Float32Array(w * h);
  const background = new Float32Array(w * h);

  // Separable max filter (dilation)
  maxFilterH(gray, temp, w, h, radius);
  maxFilterV(temp, background, w, h, radius);

  // Smooth the dilated result to remove blockiness
  gaussianApproxBlur(background, w, h, blurRadius);

  return background;
}

// ---- REMOVE SHADOWS ----
// Divide each pixel by the estimated background to normalize illumination.

function removeShadows(gray, w, h) {
  const background = estimateBackground(gray, w, h);
  const result = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const bg = Math.max(background[i], 1);
    result[i] = Math.min(255, (gray[i] / bg) * 255);
  }
  return result;
}

// ---- SAUVOLA BINARIZATION ----
// T(x,y) = mean * (1 + k * (stddev / R - 1))
// Uses integral images so cost is O(n) regardless of window size.

function sauvolaBinarize(gray, w, h, k = 0.2, R = 128) {
  const { sum, sqSum } = buildIntegralImages(gray, w, h);
  const windowSize = Math.max(15, Math.floor(Math.min(w, h) / 8) | 1);
  const halfW = Math.floor(windowSize / 2);
  const result = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - halfW);
      const y1 = Math.max(0, y - halfW);
      const x2 = Math.min(w - 1, x + halfW);
      const y2 = Math.min(h - 1, y + halfW);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const s = integralQuery(sum, w, x1, y1, x2, y2);
      const sq = integralQuery(sqSum, w, x1, y1, x2, y2);

      const mean = s / count;
      const variance = sq / count - mean * mean;
      const stddev = Math.sqrt(Math.max(0, variance));

      const threshold = mean * (1 + k * (stddev / R - 1));
      result[y * w + x] = gray[y * w + x] > threshold ? 255 : 0;
    }
  }
  return result;
}

// ---- CLAHE (Contrast Limited Adaptive Histogram Equalization) ----
// Splits image into tiles, equalizes each tile's histogram with
// a clip limit, then bilinear-interpolates between tiles.

function clahe(gray, w, h, tilesX = 8, tilesY = 8, clipLimit = 2.0) {
  const tileW = Math.ceil(w / tilesX);
  const tileH = Math.ceil(h / tilesY);
  const result = new Float32Array(w * h);
  const bins = 256;
  const maps = []; // tilesY x tilesX lookup tables

  // Build per-tile equalization maps
  for (let ty = 0; ty < tilesY; ty++) {
    maps[ty] = [];
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, w);
      const y1 = Math.min(y0 + tileH, h);
      const area = (x1 - x0) * (y1 - y0);

      // Histogram
      const hist = new Float32Array(bins);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[Math.min(255, Math.max(0, Math.floor(gray[y * w + x])))]++;
        }
      }

      // Clip histogram
      const limit = Math.max(1, (clipLimit * area) / bins);
      let excess = 0;
      for (let i = 0; i < bins; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const perBin = excess / bins;
      for (let i = 0; i < bins; i++) hist[i] += perBin;

      // CDF → lookup table
      const lut = new Float32Array(bins);
      let cumSum = 0;
      for (let i = 0; i < bins; i++) {
        cumSum += hist[i];
        lut[i] = (cumSum / area) * 255;
      }
      maps[ty][tx] = lut;
    }
  }

  // Bilinear interpolation between tiles
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const val = Math.min(255, Math.max(0, Math.floor(gray[y * w + x])));

      // Which tile center is this pixel near?
      const fx = (x / tileW) - 0.5;
      const fy = (y / tileH) - 0.5;
      const tx0 = Math.max(0, Math.floor(fx));
      const ty0 = Math.max(0, Math.floor(fy));
      const tx1 = Math.min(tilesX - 1, tx0 + 1);
      const ty1 = Math.min(tilesY - 1, ty0 + 1);

      const xAlpha = Math.max(0, Math.min(1, fx - tx0));
      const yAlpha = Math.max(0, Math.min(1, fy - ty0));

      const tl = maps[ty0][tx0][val];
      const tr = maps[ty0][tx1][val];
      const bl = maps[ty1][tx0][val];
      const br = maps[ty1][tx1][val];

      const top = tl + (tr - tl) * xAlpha;
      const bot = bl + (br - bl) * xAlpha;
      result[y * w + x] = top + (bot - top) * yAlpha;
    }
  }

  return result;
}

// ---- UNSHARP MASK (proper version) ----

function unsharpMask(gray, w, h, amount = 1.0, radius = 3) {
  const blurred = new Float32Array(gray);
  gaussianApproxBlur(blurred, w, h, radius);
  const result = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    result[i] = Math.min(255, Math.max(0, gray[i] + (gray[i] - blurred[i]) * amount));
  }
  return result;
}

// ---- PIPELINE: write grayscale result back to RGBA ----

function grayToRGBA(gray, data) {
  for (let i = 0; i < gray.length; i++) {
    const v = Math.min(255, Math.max(0, Math.round(gray[i])));
    const j = i * 4;
    data[j] = v;
    data[j + 1] = v;
    data[j + 2] = v;
    // alpha untouched
  }
}

// Blend original RGBA with processed grayscale at given intensity
function blendWithOriginal(original, processed, w, h, intensity) {
  const t = intensity / 100;
  const result = new Uint8ClampedArray(original.length);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const v = Math.round(processed[i]);
    result[j] = original[j] * (1 - t) + v * t;
    result[j + 1] = original[j + 1] * (1 - t) + v * t;
    result[j + 2] = original[j + 2] * (1 - t) + v * t;
    result[j + 3] = original[j + 3];
  }
  return result;
}

// ============================================================
// ENHANCEMENT PIPELINES
// ============================================================

function processEnhancement(data, w, h, mode, intensity) {
  const original = new Uint8ClampedArray(data);
  const gray = toGrayscale(data, w, h);

  let processed;

  switch (mode) {
    case 'auto': {
      // Shadow removal → Sauvola binarization
      const cleaned = removeShadows(gray, w, h);
      const binary = sauvolaBinarize(cleaned, w, h, 0.18, 128);
      processed = new Float32Array(binary.length);
      for (let i = 0; i < binary.length; i++) processed[i] = binary[i];
      break;
    }
    case 'scan': {
      // Aggressive: clean shadows → tight Sauvola
      const cleaned = removeShadows(gray, w, h);
      const binary = sauvolaBinarize(cleaned, w, h, 0.12, 128);
      processed = new Float32Array(binary.length);
      for (let i = 0; i < binary.length; i++) processed[i] = binary[i];
      break;
    }
    case 'lighten': {
      // Shadow removal → CLAHE (stays in grayscale, not B&W)
      const cleaned = removeShadows(gray, w, h);
      processed = clahe(cleaned, w, h, 8, 8, 2.0);
      break;
    }
    case 'sharpen': {
      // CLAHE → unsharp mask
      const enhanced = clahe(gray, w, h, 8, 8, 2.5);
      processed = unsharpMask(enhanced, w, h, 1.5, 4);
      break;
    }
    default: {
      processed = gray;
    }
  }

  return blendWithOriginal(original, processed, w, h, intensity);
}

// ============================================================
// PERSPECTIVE TRANSFORM (unchanged logic, just cleaner code)
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
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const s = srcPts[i];
    const d = dstPts[i];
    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    b.push(d.x);
    b.push(d.y);
  }
  return solveLinearSystem(A, b);
}

function applyPerspectiveTransform(sourceData, sw, sh, srcPts, ow, oh) {
  const dstPts = [
    { x: 0, y: 0 },
    { x: ow, y: 0 },
    { x: ow, y: oh },
    { x: 0, y: oh },
  ];
  const H = computePerspectiveTransform(dstPts, srcPts);
  if (!H) return null;

  const dest = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const denom = H[6] * x + H[7] * y + 1;
      if (Math.abs(denom) < 1e-10) continue;
      const srcX = (H[0] * x + H[1] * y + H[2]) / denom;
      const srcY = (H[3] * x + H[4] * y + H[5]) / denom;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);

      if (x0 >= 0 && x0 + 1 < sw && y0 >= 0 && y0 + 1 < sh) {
        const fx = srcX - x0;
        const fy = srcY - y0;
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
    if (type === 'enhance') {
      const result = processEnhancement(
        data.imageData,
        data.width,
        data.height,
        data.mode,
        data.intensity,
      );
      self.postMessage(
        { id, success: true, result, width: data.width, height: data.height },
      );
    } else if (type === 'transform') {
      const result = applyPerspectiveTransform(
        data.sourceData,
        data.sourceWidth,
        data.sourceHeight,
        data.srcPoints,
        data.outputWidth,
        data.outputHeight,
      );
      if (result) {
        self.postMessage({
          id,
          success: true,
          result,
          width: data.outputWidth,
          height: data.outputHeight,
        });
      } else {
        self.postMessage({
          id,
          success: false,
          error: 'Transform failed — invalid polygon',
        });
      }
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};