// Color conversions and pixel sampling.
export function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

export function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

// Averages a square of `size` pixels centred on (x, y), weighting color by alpha.
export function averageSample(data, width, height, x, y, size = 1) {
  const half = Math.floor(size / 2);
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let yy = y - half; yy <= y + half; yy++) {
    if (yy < 0 || yy >= height) continue;
    for (let xx = x - half; xx <= x + half; xx++) {
      if (xx < 0 || xx >= width) continue;
      const p = (yy * width + xx) * 4;
      const alpha = data[p + 3];
      r += data[p] * alpha;
      g += data[p + 1] * alpha;
      b += data[p + 2] * alpha;
      a += alpha;
      n++;
    }
  }
  if (!n) return [0, 0, 0, 0];
  if (!a) return [0, 0, 0, 0];
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / n)];
}
