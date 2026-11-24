// The gray level (0–255) below which `fraction` of the values lie.
export function percentile(values, fraction) {
  const hist = new Uint32Array(256);
  for (const v of values) hist[Math.max(0, Math.min(255, v | 0))]++;
  let seen = 0;
  const target = values.length * fraction;
  for (let t = 0; t < 256; t++) if ((seen += hist[t]) >= target) return t;
  return 255;
}
