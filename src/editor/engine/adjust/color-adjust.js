// Per-pixel color adjustments on RGBA data, in place. Formulas follow the CSS
// filter definitions, so values mean the same as in any browser or CSS tool.
export const NEUTRAL_ADJUSTMENT = { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

export const isNeutral = (a) =>
  a.brightness === 100 && a.contrast === 100 && a.saturation === 100 && a.hue === 0;

export function adjustColors(data, { brightness = 100, contrast = 100, saturation = 100, hue = 0 }) {
  const b = brightness / 100;
  const c = contrast / 100;
  const m = colorMatrix(saturation / 100, hue);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(((v / 255) * b - 0.5) * c * 255 + 127.5);
  const identity = m.every((v, i) => v === [1, 0, 0, 0, 1, 0, 0, 0, 1][i]);
  for (let p = 0; p < data.length; p += 4) {
    let r = lut[data[p]], g = lut[data[p + 1]], bl = lut[data[p + 2]];
    if (!identity) {
      const nr = m[0] * r + m[1] * g + m[2] * bl;
      const ng = m[3] * r + m[4] * g + m[5] * bl;
      const nb = m[6] * r + m[7] * g + m[8] * bl;
      r = nr; g = ng; bl = nb;
    }
    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = bl;
  }
  return data;
}

// Saturation followed by hue rotation (CSS Filter Effects matrices).
function colorMatrix(s, degrees) {
  const sat = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  if (!degrees) return sat;
  const a = (degrees * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const hue = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
  const out = new Array(9);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out[r * 3 + c] = hue[r * 3] * sat[c] + hue[r * 3 + 1] * sat[3 + c] + hue[r * 3 + 2] * sat[6 + c];
  return out;
}

export function desaturate(data) {
  for (let p = 0; p < data.length; p += 4) {
    const y = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    data[p] = data[p + 1] = data[p + 2] = y;
  }
  return data;
}

export function invertColors(data) {
  for (let p = 0; p < data.length; p += 4) {
    data[p] = 255 - data[p];
    data[p + 1] = 255 - data[p + 1];
    data[p + 2] = 255 - data[p + 2];
  }
  return data;
}
