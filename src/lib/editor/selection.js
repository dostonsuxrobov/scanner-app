// Browser-native 8-bit selection masks. Behavioral references are documented in
// docs/editor-research.md; no GIMP/GEGL source is included in this module.
export function canvas(w, h) {
  return Object.assign(document.createElement("canvas"), {
    width: w,
    height: h,
  });
}
export function maskCanvas(mask, width, height) {
  const c = canvas(width, height),
    ctx = c.getContext("2d");
  const pixels = ctx.createImageData(width, height);
  for (let i = 0; i < mask.length; i++) pixels.data[i * 4 + 3] = mask[i];
  ctx.putImageData(pixels, 0, 0);
  return c;
}
export function selectionFromMask(mask, width, height, rect = null) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1,
    count = 0;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      const x = i % width,
        y = Math.floor(i / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count++;
    }
  // An empty mask stays distinct from no selection: edits affect no pixels.
  return {
    mask,
    x: count ? left : 0,
    y: count ? top : 0,
    w: count ? right - left + 1 : 0,
    h: count ? bottom - top + 1 : 0,
    count,
    rect,
  };
}
export function rectangleMask(width, height, rect, feather = 0) {
  const c = canvas(width, height),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (feather > 0) {
    const copy = canvas(width, height);
    const cx = copy.getContext("2d");
    cx.filter = `blur(${feather}px)`;
    cx.drawImage(c, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(copy, 0, 0);
  }
  const rgba = ctx.getImageData(0, 0, width, height).data;
  return Uint8ClampedArray.from(
    { length: width * height },
    (_, i) => rgba[i * 4 + 3],
  );
}
export function combineMasks(base, next, mode) {
  if (mode === "replace") return next;
  if (!base) return mode === "add" ? next : new Uint8ClampedArray(next.length);
  return next.map((n, i) =>
    mode === "add"
      ? Math.max(base[i], n)
      : mode === "subtract"
        ? Math.max(0, base[i] - n)
        : Math.min(base[i], n),
  );
}
export function translateMask(mask, width, height, dx, dy) {
  const result = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    const left = Math.max(0, -dx),
      right = Math.min(width, width - dx);
    if (right > left)
      result.set(
        mask.subarray(y * width + left, y * width + right),
        ny * width + left + dx,
      );
  }
  return result;
}
export function selectColor(
  data,
  sample,
  {
    threshold = 15,
    antialias = true,
    transparent = false,
    criterion = "rgb",
  } = {},
) {
  const out = new Uint8ClampedArray(data.length / 4);
  const alphaOnly = transparent && sample[3] === 0;
  const channel = { red: 0, green: 1, blue: 2, alpha: 3 }[criterion];
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    if (data[p + 3] === 0 && !alphaOnly) continue;
    let difference;
    if (alphaOnly) difference = data[p + 3];
    else if (channel !== undefined)
      difference = Math.abs(data[p + channel] - sample[channel]);
    else if (criterion === "brightness")
      difference = Math.abs(
        Math.max(data[p], data[p + 1], data[p + 2]) -
          Math.max(sample[0], sample[1], sample[2]),
      );
    else
      difference = Math.max(
        Math.abs(data[p] - sample[0]),
        Math.abs(data[p + 1] - sample[1]),
        Math.abs(data[p + 2] - sample[2]),
      );
    // Full inclusion through the tolerance, with an optional soft edge beyond it.
    const softWidth =
      antialias && threshold > 0 ? Math.max(1, threshold / 2) : 0;
    out[i] =
      difference <= threshold
        ? 255
        : softWidth
          ? Math.round(
              255 * Math.max(0, 1 - (difference - threshold) / softWidth),
            )
          : 0;
  }
  return out;
}
export function overlayCanvas(selection, width, height) {
  const c = canvas(width, height),
    ctx = c.getContext("2d");
  const image = ctx.createImageData(width, height),
    m = selection.mask;
  for (let i = 0; i < m.length; i++)
    if (m[i]) {
      const x = i % width,
        y = Math.floor(i / width),
        p = i * 4;
      const edge =
        m[i] >= 128 &&
        (x === 0 ||
          y === 0 ||
          x === width - 1 ||
          y === height - 1 ||
          m[i - 1] < 128 ||
          m[i + 1] < 128 ||
          m[i - width] < 128 ||
          m[i + width] < 128);
      if (edge) {
        const value = (x + y) % 10 < 5 ? 255 : 24;
        image.data[p] = image.data[p + 1] = image.data[p + 2] = value;
        image.data[p + 3] = 255;
      } else {
        image.data[p] = 79;
        image.data[p + 1] = 113;
        image.data[p + 2] = 150;
        image.data[p + 3] = Math.round(m[i] * 0.16);
      }
    }
  ctx.putImageData(image, 0, 0);
  return c;
}
export function rasterTransform(
  source,
  width,
  height,
  angle,
  flipX = false,
  flipY = false,
  smoothing = true,
) {
  const rad = (angle * Math.PI) / 180,
    co = Math.abs(Math.cos(rad)),
    si = Math.abs(Math.sin(rad));
  const w = Math.max(1, Math.ceil(width * co + height * si - 1e-8));
  const h = Math.max(1, Math.ceil(width * si + height * co - 1e-8));
  if (w > 6000 || h > 6000 || w * h > 16000000)
    throw new Error("Transform exceeds 6,000 px or 16 megapixels.");
  const c = canvas(w, h),
    ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(source, -width / 2, -height / 2, width, height);
  return c;
}
