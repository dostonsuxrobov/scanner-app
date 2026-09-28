// One-click fix: find the page, flatten it, and clean it like a scan.
//
// `predictGrid(region)` (optional, async) runs a page-unwarping network
// (UVDoc) on a region of the photo and returns its page grid in photo pixels,
// or null. A flat page is straightened with an exact perspective warp from
// its corners; a curved, folded, or crumpled page is resampled through the
// network's grid. Without the network, flat-page straightening is used.
import { detectDocument } from "./detect-document.js";
import { pageSize, sizeFromAspect } from "./output-size.js";
import { applyPerspectiveTransform } from "./perspective.js";
import { cleanDocument } from "./clean-document.js";
import { clearBorder } from "./clear-border.js";
import { curvature, surfaceLengths } from "./grid-analysis.js";
import { unwarpWithGrid } from "./grid-unwarp.js";
import { gridCorners } from "./uvdoc-grid.js";
import { boundsShare, inset, regionAround, sameQuad } from "./page-quad.js";

// Corners are pulled in slightly so no sliver of the background survives.
const INSET = 0.006;
// A page covering less of the photo than this is looked at again, closer up.
const SMALL_PAGE = 0.5;
// UVDoc was trained on photos with some background around the page.
const REGION_MARGIN = 0.08;
// The closer look must find the same page (corner distance, share of the
// page's diagonal).
const SAME_PAGE = 0.1;
// Classic edge-based corners are sharper than the network's; they are used
// when both agree this closely.
const CORNERS_AGREE = 0.04;
// Grid deviation from a flat plane (share of the page's size) above which
// the page counts as curved.
const CURVED = 0.006;

function straighten(data, width, height, corners) {
  const size = pageSize(corners, width, height);
  const warped = applyPerspectiveTransform(data, width, height, corners, size.width, size.height);
  return warped && { data: warped, width: size.width, height: size.height, paper: size.paper, method: "perspective" };
}

function flatten(data, width, height, points) {
  const { width: w, height: h } = surfaceLengths(points);
  const size = sizeFromAspect(w / h, Math.max(w, h));
  const out = unwarpWithGrid(data, width, height, points, size.width, size.height);
  return { data: out, width: size.width, height: size.height, paper: size.paper, method: "curved" };
}

// The network finds the page itself, so it sees the whole photo. A small page
// gets a second, closer look for a finer grid.
async function locatePage(predictGrid, width, height) {
  const whole = await predictGrid({ x: 0, y: 0, w: width, h: height });
  if (!whole || boundsShare(gridCorners(whole), width, height) >= SMALL_PAGE) return whole;
  const closer = await predictGrid(regionAround(gridCorners(whole), width, height, REGION_MARGIN));
  return closer && sameQuad(gridCorners(closer), gridCorners(whole), SAME_PAGE) ? closer : whole;
}

export async function oneClickFix(data, width, height, { predictGrid = null } = {}) {
  const detected = detectDocument(data, width, height);
  const corners = detected.found ? inset(detected.corners, INSET) : null;
  let points = null;
  let aiError = null;
  if (predictGrid) {
    try {
      points = await locatePage(predictGrid, width, height);
    } catch (error) {
      aiError = error.message || String(error);
    }
  }
  let result = null;
  if (points) {
    const { width: w, height: h } = surfaceLengths(points);
    const bent = curvature(points) / Math.max(w, h) > CURVED;
    const networkCorners = gridCorners(points);
    const flatCorners = corners && sameQuad(corners, networkCorners, CORNERS_AGREE) ? corners : inset(networkCorners, INSET);
    result = bent ? flatten(data, width, height, points) : straighten(data, width, height, flatCorners);
  } else if (corners) result = straighten(data, width, height, corners);
  const out = result ?? { data: new Uint8ClampedArray(data), width, height, paper: null, method: "none" };
  cleanDocument(out.data, out.width, out.height);
  if (result) clearBorder(out.data, out.width, out.height);
  return { data: out.data, width: out.width, height: out.height, paper: out.paper, method: out.method, aiError };
}
