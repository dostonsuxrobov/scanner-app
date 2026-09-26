// Global "select by color": compares every pixel with a sampled color.
// Distances are computed once per click; changing the threshold only re-maps
// them, which keeps threshold dragging interactive on large images.
const CHANNELS = { red: 0, green: 1, blue: 2, alpha: 3 };
export const EXCLUDED = 65535;

export function colorDistances(data, sample, { criterion = "rgb", transparent = false } = {}) {
  const out = new Uint16Array(data.length / 4);
  const n = out.length;
  // Sampling an empty pixel with "select transparent" compares opacity only.
  if (transparent && sample[3] === 0) {
    for (let i = 0, p = 3; i < n; i++, p += 4) out[i] = data[p];
    return out;
  }
  const channel = CHANNELS[criterion];
  if (channel === 3) {
    for (let i = 0, p = 3; i < n; i++, p += 4) out[i] = Math.abs(data[p] - sample[3]);
    return out;
  }
  // Hidden (fully transparent) pixels never match a visible color.
  if (channel !== undefined) {
    const s = sample[channel];
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const d = data[p + channel] - s;
      out[i] = data[p + 3] === 0 ? EXCLUDED : d < 0 ? -d : d;
    }
    return out;
  }
  if (criterion === "brightness") {
    const s = Math.max(sample[0], sample[1], sample[2]);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const d = (r > g ? (r > b ? r : b) : g > b ? g : b) - s;
      out[i] = data[p + 3] === 0 ? EXCLUDED : d < 0 ? -d : d;
    }
    return out;
  }
  const s0 = sample[0], s1 = sample[1], s2 = sample[2];
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (data[p + 3] === 0) {
      out[i] = EXCLUDED;
      continue;
    }
    let r = data[p] - s0, g = data[p + 1] - s1, b = data[p + 2] - s2;
    if (r < 0) r = -r;
    if (g < 0) g = -g;
    if (b < 0) b = -b;
    out[i] = r > g ? (r > b ? r : b) : g > b ? g : b;
  }
  return out;
}

// Full inclusion up to the threshold, with an optional soft edge beyond it.
export function distancesToMask(distances, threshold, antialias = true) {
  const out = new Uint8ClampedArray(distances.length);
  const soft = antialias && threshold > 0 ? Math.max(1, threshold / 2) : 0;
  const lut = new Uint8ClampedArray(256);
  for (let d = 0; d < 256; d++)
    lut[d] = d <= threshold ? 255 : soft ? Math.round(255 * Math.max(0, 1 - (d - threshold) / soft)) : 0;
  for (let i = 0; i < distances.length; i++) {
    const d = distances[i];
    out[i] = d > 255 ? 0 : lut[d];
  }
  return out;
}

export function selectColor(data, sample, { threshold = 15, antialias = true, transparent = false, criterion = "rgb" } = {}) {
  return distancesToMask(colorDistances(data, sample, { criterion, transparent }), threshold, antialias);
}
