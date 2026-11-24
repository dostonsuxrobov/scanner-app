// Auto contrast: stretches brightness so the darkest part of the image
// becomes black and the lightest white. All channels share one range, so
// colors keep their hue. The darkest and lightest 0.5% of pixels are ignored,
// so specks and scanner dust do not hold the range back.
const CLIP = 0.005;

// Brightness range of the visible pixels. `coverage` (optional, one byte per
// pixel) limits the measurement to pixels that are at least half selected.
export function levelRange(data, coverage) {
  const histogram = new Uint32Array(256);
  let count = 0;
  for (let i = 0, p = 0; p < data.length; i++, p += 4) {
    if (!data[p + 3] || (coverage && coverage[i] < 128)) continue;
    histogram[Math.round(0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2])]++;
    count++;
  }
  const skip = count * CLIP;
  let low = 0, high = 255;
  for (let seen = histogram[0]; seen <= skip && low < 255; seen += histogram[++low]);
  for (let seen = histogram[255]; seen <= skip && high > 0; seen += histogram[--high]);
  return { low, high };
}

export function stretchContrast(data, coverage) {
  const { low, high } = levelRange(data, coverage);
  if (high <= low) return data; // a flat (or empty) area has nothing to stretch
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(((v - low) * 255) / (high - low));
  for (let p = 0; p < data.length; p += 4) {
    data[p] = lut[data[p]];
    data[p + 1] = lut[data[p + 1]];
    data[p + 2] = lut[data[p + 2]];
  }
  return data;
}
