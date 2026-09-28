// Fills the cells of a map that carry no measurement from the measured cells
// around them (normalized convolution): each gap takes the local mean of its
// known neighbours, looking further out until one is found. Known cells keep
// their value.
import { boxBlur } from "./filters.js";

export function fillGaps(values, known, width, height, radius) {
  const out = Float32Array.from(values);
  const have = Float32Array.from(known, (k) => (k ? 1 : 0));
  if (!have.some(Boolean)) return out;
  for (let r = Math.max(1, radius); have.some((h) => h < 1); r *= 2) {
    const weighted = boxBlur(out.map((v, i) => v * have[i]), width, height, r);
    const weight = boxBlur(have, width, height, r);
    for (let i = 0; i < out.length; i++) {
      if (have[i] === 1 || weight[i] < 1e-4) continue;
      out[i] = weighted[i] / weight[i];
      have[i] = 1;
    }
  }
  return out;
}
