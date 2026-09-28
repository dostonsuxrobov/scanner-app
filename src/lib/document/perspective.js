// Perspective (homography) warp of a quadrilateral onto a rectangle, with
// bilinear sampling. Shared by the manual perspective crop and One-click fix.
function solveLinearSystem(A, b) {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
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

// Homography mapping srcPts[i] → dstPts[i] (four point pairs).
export function computePerspectiveTransform(srcPts, dstPts) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const s = srcPts[i], d = dstPts[i];
    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    b.push(d.x, d.y);
  }
  return solveLinearSystem(A, b);
}

// srcPts: corners in the source image (TL, TR, BR, BL). Pixels that fall
// outside the source become white.
export function applyPerspectiveTransform(sourceData, sw, sh, srcPts, ow, oh) {
  const dstPts = [{ x: 0, y: 0 }, { x: ow, y: 0 }, { x: ow, y: oh }, { x: 0, y: oh }];
  const H = computePerspectiveTransform(dstPts, srcPts);
  if (!H) return null;
  const dest = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      // Sample at pixel centres so the page maps edge to edge.
      const px = x + 0.5, py = y + 0.5;
      const denom = H[6] * px + H[7] * py + 1;
      const idx = (y * ow + x) * 4;
      const srcX = (H[0] * px + H[1] * py + H[2]) / denom - 0.5;
      const srcY = (H[3] * px + H[4] * py + H[5]) / denom - 0.5;
      const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
      if (Math.abs(denom) < 1e-10 || x0 < -1 || y0 < -1 || x0 >= sw || y0 >= sh) {
        dest[idx] = dest[idx + 1] = dest[idx + 2] = dest[idx + 3] = 255;
        continue;
      }
      const fx = srcX - x0, fy = srcY - y0;
      const xa = Math.max(0, x0), xb = Math.min(sw - 1, x0 + 1);
      const ya = Math.max(0, y0), yb = Math.min(sh - 1, y0 + 1);
      const i00 = (ya * sw + xa) * 4, i10 = (ya * sw + xb) * 4, i01 = (yb * sw + xa) * 4, i11 = (yb * sw + xb) * 4;
      for (let c = 0; c < 4; c++)
        dest[idx + c] =
          sourceData[i00 + c] * (1 - fx) * (1 - fy) +
          sourceData[i10 + c] * fx * (1 - fy) +
          sourceData[i01 + c] * (1 - fx) * fy +
          sourceData[i11 + c] * fx * fy;
    }
  }
  return dest;
}
