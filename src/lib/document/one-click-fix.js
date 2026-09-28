// One-click fix: find the page, straighten it, and clean it like a scan.
// If no page edges are found, the whole photo is cleaned without cropping.
import { detectDocument } from "./detect-document.js";
import { pageSize } from "./output-size.js";
import { applyPerspectiveTransform } from "./perspective.js";
import { cleanDocument } from "./clean-document.js";

// Pull the corners in slightly so no sliver of the background survives.
const INSET = 0.006;

function inset(corners) {
  const cx = corners.reduce((s, p) => s + p.x, 0) / 4;
  const cy = corners.reduce((s, p) => s + p.y, 0) / 4;
  return corners.map((p) => ({ x: p.x + (cx - p.x) * INSET * 2, y: p.y + (cy - p.y) * INSET * 2 }));
}

export function oneClickFix(data, width, height) {
  const detected = detectDocument(data, width, height);
  const found = detected.found;
  const corners = found ? inset(detected.corners) : null;
  const size = found ? pageSize(corners, width, height) : null;
  const warped = size && applyPerspectiveTransform(data, width, height, corners, size.width, size.height);
  const out = warped
    ? { data: warped, width: size.width, height: size.height }
    : { data: new Uint8ClampedArray(data), width, height };
  cleanDocument(out.data, out.width, out.height);
  return { ...out, straightened: !!warped, corners: warped ? corners : null, paper: warped ? size.paper : null };
}
