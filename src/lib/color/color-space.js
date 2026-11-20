// Converts colors between HSV (hue 0–360, saturation 0–1, value 0–1) and #rrggbb hex.

const clamp01 = (n) => Math.min(1, Math.max(0, n));

export function hsvToHex({ h, s, v }) {
  const hue = (((h % 360) + 360) % 360) / 60;
  const sat = clamp01(s);
  const val = clamp01(v);
  const c = val * sat;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(hue) % 6];
  const m = val - c;
  return "#" + [r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("");
}

export function hexToHsv(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}
