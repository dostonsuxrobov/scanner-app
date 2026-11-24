// Grows or shrinks a selection mask by a number of pixels. Each pixel takes
// the highest coverage found within `radius` of it horizontally and
// vertically (a square neighbourhood), so soft edges stay soft.
import { invertMask } from "./mask.js";

export function growMask(mask, width, height, radius) {
  const r = Math.round(radius);
  if (r <= 0) return mask;
  return spread(spread(mask, width, height, r, true), width, height, r, false);
}

// Shrinking is growing the unselected area. Outside the image counts as
// selected, so a selection touching the image edge stays attached to it.
export function shrinkMask(mask, width, height, radius) {
  return invertMask(growMask(invertMask(mask), width, height, radius));
}

// Maximum over a window of 2r + 1 along every row or column, in linear time
// (van Herk): running maxima from each block's start and towards each block's
// end; a window always spans the end of one block and the start of the next.
function spread(src, width, height, r, horizontal) {
  const out = new Uint8ClampedArray(src.length);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? 1 : width;
  const block = 2 * r + 1;
  const padded = length + 2 * r; // r empty pixels on both sides
  const line = new Uint8Array(padded), fromStart = new Uint8Array(padded), toEnd = new Uint8Array(padded);
  for (let n = 0; n < lines; n++) {
    const start = horizontal ? n * width : n;
    for (let i = 0; i < length; i++) line[i + r] = src[start + i * step];
    for (let i = 0; i < padded; i++) fromStart[i] = i % block ? Math.max(fromStart[i - 1], line[i]) : line[i];
    for (let i = padded - 1; i >= 0; i--) toEnd[i] = i === padded - 1 || i % block === block - 1 ? line[i] : Math.max(toEnd[i + 1], line[i]);
    for (let i = 0; i < length; i++) out[start + i * step] = Math.max(toEnd[i], fromStart[i + 2 * r]);
  }
  return out;
}
