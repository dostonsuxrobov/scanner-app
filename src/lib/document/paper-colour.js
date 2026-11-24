// Which cells of a page's colour maps have the colour of the paper around
// them. Light changes colour gradually across a page (a warm lamp on one
// side, a bluish shadow on the other), so each cell is compared with the
// paper colour of its wider neighbourhood. A tinted table cell, a highlighted
// block, or a pastel picture stands out against it; a shadow does not.
// (An area wider than the neighbourhood is its own surroundings and passes
// as paper: it cannot be told from a region lit by a differently colored
// light, and removing shadows matters more.)
import { boxBlur } from "./filters.js";

const NEIGHBOURHOOD = 0.06; // radius, share of the map's long side
const TOLERANCE = 0.05; // difference in a channel's share of the brightness

// r, b, lum: maps (Float32Array, width × height); candidate: Uint8Array of
// cells that may be paper. Returns a Uint8Array: 1 where the colour fits.
export function paperColoured(r, b, lum, candidate, width, height) {
  const radius = Math.max(2, Math.round(Math.max(width, height) * NEIGHBOURHOOD));
  const red = r.map((v, i) => v / Math.max(1, lum[i])), blue = b.map((v, i) => v / Math.max(1, lum[i]));
  // Mean of `values` over nearby cells of `mask`.
  const around = (values, mask) => {
    const sum = boxBlur(values.map((v, i) => v * mask[i]), width, height, radius);
    const weight = boxBlur(mask, width, height, radius);
    return sum.map((v, i) => (weight[i] > 1e-4 ? v / weight[i] : values[i]));
  };
  let fits = Float32Array.from(candidate);
  // The second pass leaves out what the first found tinted, so a tinted area
  // does not pull its own reference towards itself.
  for (let pass = 0; pass < 2; pass++) {
    const paperRed = around(red, fits), paperBlue = around(blue, fits);
    fits = Float32Array.from(candidate, (c, i) =>
      c && Math.abs(red[i] - paperRed[i]) <= TOLERANCE && Math.abs(blue[i] - paperBlue[i]) <= TOLERANCE ? 1 : 0,
    );
  }
  return Uint8Array.from(fits);
}
