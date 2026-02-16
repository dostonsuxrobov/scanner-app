// ============================================================
// image-processor.js — Web Worker (optimized)
// ============================================================

// ---- INTEGRAL IMAGES ----

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

function integralQuery(img, w, x1, y1, x2, y2) {
  const d = img[y2 * w + x2];
  const a = x1 > 0 && y1 > 0 ? img[(y1 - 1) * w + (x1 - 1)] : 0;
  const b = y1 > 0 ? img[(y1 - 1) * w + x2] : 0;
  const c = x1 > 0 ? img[y2 * w + (x1 - 1)] : 0;
  return d - b - c + a;
}

// ---- GRAYSCALE ----

function toGrayscale(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    gray[i] = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
  }
  return gray;
}

// ---- SEPARABLE BOX BLUR (O(n) regardless of radius) ----

function boxBlurH(src, dst, w, h, r) {
  const d = r + r + 1;
  const inv = 1.0 / d;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = src[row] * (r + 1);
    for (let x = 0; x < r; x++) acc += src[row + x];
    for (let x = 0; x < w; x++) {
      acc += src[row + Math.min(x + r, w - 1)];
      dst[row + x] = acc * inv;
      acc -= src[row + Math.max(x - r, 0)];
    }
  }
}

function boxBlurV(src, dst, w, h, r) {
  const d = r + r + 1;
  const inv = 1.0 / d;
  for (let x = 0; x < w; x++) {
    let acc = src[x] * (r + 1);
    for (let y = 0; y < r; y++) acc += src[y * w + x];
    for (let y = 0; y < h; y++) {
      acc += src[Math.min(y + r, h - 1) * w + x];
      dst[y * w + x] = acc * inv;
      acc -= src[Math.max(y - r, 0) * w + x];
    }
  }
}

function gaussianApproxBlur(data, w, h, radius) {
  const temp = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(data, temp, w, h, radius);
    boxBlurV(temp, data, w, h, radius);
  }
}

// ---- SLIDING WINDOW MAX FILTER (O(n) using monotonic deque) ----

function maxFilterH(src, dst, w, h, r) {
  const deque = new Int32Array(w);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let head = 0;
    let tail = 0;
    for (let x = 0; x < w; x++) {
      const winStart = Math.max(0, x - r);
      while (head < tail && deque[head] < winStart) head++;
      while (head < tail && src[row + deque[tail - 1]] <= src[row + x]) tail--;
      deque[tail++] = x;
      dst[row + x] = src[row + deque[head]];
    }
  }
}

function maxFilterV(src, dst, w, h, r) {
  const deque = new Int32Array(h);
  for (let x = 0; x < w; x++) {
    let head = 0;
    let tail = 0;
    for (let y = 0; y < h; y++) {
      const winStart = Math.max(0, y - r);
      while (head < tail && deque[head] < winStart) head++;
      while (head < tail && src[deque[tail - 1] * w + x] <= src[y * w + x]) tail--;
      deque[tail++] = y;
      dst[y * w + x] = src[deque[head] * w + x];
    }
  }
}

// ---- DOWNSCALE + UPSCALE ----

function downscale2x(gray, w, h) {
  const nw = Math.ceil(w / 2);
  const nh = Math.ceil(h / 2);
  const out = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(x * 2, w - 1);
      const sy = Math.min(y * 2, h - 1);
      out[y * nw + x] = gray[sy * w + sx];
    }
  }
  return { data: out, width: nw, height: nh };
}

function upscaleBilinear(small, sw, sh, tw, th) {
  const out = new Float32Array(tw * th);
  const xRatio = sw / tw;
  const yRatio = sh / th;
  for (let y = 0; y < th; y++) {
    const sy = y * yRatio;
    const y0 = Math.min(Math.floor(sy), sh - 1);
    const y1 = Math.min(y0 + 1, sh - 1);
    const fy = sy - y0;
    for (let x = 0; x < tw; x++) {
      const sx = x * xRatio;
      const x0 = Math.min(Math.floor(sx), sw - 1);
      const x1 = Math.min(x0 + 1, sw - 1);
      const fx = sx - x0;
      out[y * tw + x] =
        small[y0 * sw + x0] * (1 - fx) * (1 - fy) +
        small[y0 * sw + x1] * fx * (1 - fy) +
        small[y1 * sw + x0] * (1 - fx) * fy +
        small[y1 * sw + x1] * fx * fy;
    }
  }
  return out;
}

// ---- MORPHOLOGICAL BACKGROUND ESTIMATION ----

function estimateBackground(gray, w, h) {
  const pixels = w * h;
  const LARGE_THRESHOLD = 1500 * 1500;

  if (pixels > LARGE_THRESHOLD) {
    const { data: small, width: sw, height: sh } = downscale2x(gray, w, h);
    const radius = Math.max(10, Math.floor(Math.min(sw, sh) / 20));
    const blurRadius = Math.max(5, Math.floor(radius / 2));

    const temp = new Float32Array(sw * sh);
    const bg = new Float32Array(sw * sh);

    maxFilterH(small, temp, sw, sh, radius);
    maxFilterV(temp, bg, sw, sh, radius);
    gaussianApproxBlur(bg, sw, sh, blurRadius);

    return upscaleBilinear(bg, sw, sh, w, h);
  }

  const radius = Math.max(10, Math.floor(Math.min(w, h) / 25));
  const blurRadius = Math.max(5, Math.floor(radius / 2));

  const temp = new Float32Array(w * h);
  const background = new Float32Array(w * h);

  maxFilterH(gray, temp, w, h, radius);
  maxFilterV(temp, background, w, h, radius);
  gaussianApproxBlur(background, w, h, blurRadius);

  return background;
}

// ---- REMOVE SHADOWS ----

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

function sauvolaBinarize(gray, w, h, k = 0.2, R = 128) {
  const { sum, sqSum } = buildIntegralImages(gray, w, h);
  const windowSize = Math.max(15, Math.floor(Math.min(w, h) / 8) | 1);
  const halfW = Math.floor(windowSize / 2);
  const result = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - halfW);
    const y2 = Math.min(h - 1, y + halfW);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - halfW);
      const x2 = Math.min(w - 1, x + halfW);
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

// ---- CLAHE ----

function clahe(gray, w, h, tilesX = 8, tilesY = 8, clipLimit = 2.0) {
  const tileW = Math.ceil(w / tilesX);
  const tileH = Math.ceil(h / tilesY);
  const bins = 256;

  const luts = new Float32Array(tilesY * tilesX * bins);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, w);
      const y1 = Math.min(y0 + tileH, h);
      const area = (x1 - x0) * (y1 - y0);

      const hist = new Float32Array(bins);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[Math.min(255, Math.max(0, gray[y * w + x] | 0))]++;
        }
      }

      const limit = Math.max(1, (clipLimit * area) / bins);
      let excess = 0;
      for (let i = 0; i < bins; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const perBin = excess / bins;

      const offset = (ty * tilesX + tx) * bins;
      let cumSum = 0;
      for (let i = 0; i < bins; i++) {
        cumSum += hist[i] + perBin;
        luts[offset + i] = (cumSum / area) * 255;
      }
    }
  }

  const result = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = (y / tileH) - 0.5;
    const ty0 = Math.max(0, fy | 0);
    const ty1 = Math.min(tilesY - 1, ty0 + 1);
    const yAlpha = Math.max(0, Math.min(1, fy - ty0));

    for (let x = 0; x < w; x++) {
      const val = Math.min(255, Math.max(0, gray[y * w + x] | 0));
      const fx = (x / tileW) - 0.5;
      const tx0 = Math.max(0, fx | 0);
      const tx1 = Math.min(tilesX - 1, tx0 + 1);
      const xAlpha = Math.max(0, Math.min(1, fx - tx0));

      const tl = luts[(ty0 * tilesX + tx0) * bins + val];
      const tr = luts[(ty0 * tilesX + tx1) * bins + val];
      const bl = luts[(ty1 * tilesX + tx0) * bins + val];
      const br = luts[(ty1 * tilesX + tx1) * bins + val];

      const top = tl + (tr - tl) * xAlpha;
      const bot = bl + (br - bl) * xAlpha;
      result[y * w + x] = top + (bot - top) * yAlpha;
    }
  }

  return result;
}

// ---- UNSHARP MASK ----

function unsharpMask(gray, w, h, amount = 1.0, radius = 3) {
  const blurred = new Float32Array(gray);
  gaussianApproxBlur(blurred, w, h, radius);
  const result = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    result[i] = Math.min(255, Math.max(0, gray[i] + (gray[i] - blurred[i]) * amount));
  }
  return result;
}

// ---- BLEND ----

function blendWithOriginal(original, processed, w, h, intensity) {
  const t = intensity / 100;
  const result = new Uint8ClampedArray(original.length);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    const v = processed[i];
    result[j] = original[j] + (v - original[j]) * t;
    result[j + 1] = original[j + 1] + (v - original[j + 1]) * t;
    result[j + 2] = original[j + 2] + (v - original[j + 2]) * t;
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
      const cleaned = removeShadows(gray, w, h);
      const binary = sauvolaBinarize(cleaned, w, h, 0.18, 128);
      processed = new Float32Array(binary.length);
      for (let i = 0; i < binary.length; i++) processed[i] = binary[i];
      break;
    }
    case 'scan': {
      const cleaned = removeShadows(gray, w, h);
      const binary = sauvolaBinarize(cleaned, w, h, 0.12, 128);
      processed = new Float32Array(binary.length);
      for (let i = 0; i < binary.length; i++) processed[i] = binary[i];
      break;
    }
    case 'lighten': {
      const cleaned = removeShadows(gray, w, h);
      processed = clahe(cleaned, w, h, 8, 8, 2.0);
      break;
    }
    case 'sharpen': {
      const enhanced = clahe(gray, w, h, 8, 8, 2.5);
      processed = unsharpMask(enhanced, w, h, 1.5, 4);
      break;
    }
    default:
      processed = gray;
  }

  return blendWithOriginal(original, processed, w, h, intensity);
}

// ============================================================
// PERSPECTIVE TRANSFORM
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
    if (type === 'enhance') {
      const result = processEnhancement(
        data.imageData, data.width, data.height, data.mode, data.intensity,
      );
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
