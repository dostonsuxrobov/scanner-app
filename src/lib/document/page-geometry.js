// Decides how a photographed page is straightened, from what the photo
// itself shows.
//
// Two finders propose where the page is: the classic edge-based corners and
// the unwarping network's grid. Neither is believed on its own; each proposal
// is scored by how much of its outline lies on a real edge in the photo.
//  - A straight-sided outline on clear edges is a flat page: an exact
//    perspective warp from its corners keeps straight lines straight.
//  - Otherwise, a grid that is clearly bent and reasonably on the page's
//    edges is a curved page: it is flattened through the grid.
//  - A photo with no convincing outline, or one the page already fills, is
//    left as it is. Cropping to a guess would cut into the page.
import { curvature, surfaceLengths } from "./grid-analysis.js";
import { gridCorners, gridOutline } from "./uvdoc-grid.js";
import { outlineSupport, quadSides } from "./outline-support.js";
import { borderedByPaper } from "./paper-border.js";
import { sameQuad } from "./page-quad.js";
import { polygonArea } from "./quad-fit.js";

// Outline support (0–1) at which straight sides are taken as the page's edges.
const CLEAR = 0.8;
// ... at which they are still used when nothing better is on offer.
const FAINT = 0.6;
// ... the network's outline needs for its grid to be used. A book page's edges
// (gutter, page stack) are weaker than a loose sheet's.
const GRID = 0.4;
// Grid deviation from a flat plane (share of the page's size) above which
// the page counts as curved.
const CURVED = 0.004;

// Classic edge-based corners are sharper than the network's; they are used
// when both mark the same page (corner distance, share of the page's diagonal).
const CORNERS_AGREE = 0.04;

// Of straight outlines that all lie on clear edges, the page is the outer
// one: a picture or a table printed on a page has clear edges too.
function clearest(quads) {
  const clear = quads.filter((q) => q.support >= CLEAR);
  if (clear.length < 2 || sameQuad(clear[0].corners, clear[1].corners, CORNERS_AGREE)) return clear[0] ?? null;
  return clear.sort((a, b) => polygonArea(b.corners) - polygonArea(a.corners))[0];
}

// map: edgeMap() of the photo; classic: corners (TL, TR, BR, BL) or null;
// points: the network's grid in photo pixels, or null.
// Returns { kind: "perspective", corners }, { kind: "curved", points }, or null.
export function choosePageGeometry(map, classic, points) {
  const quads = [classic, points && gridCorners(points)]
    .filter(Boolean)
    .map((corners) => ({ corners, support: outlineSupport(map, quadSides(corners)) }));
  let grid = null;
  if (points) {
    const { width, height } = surfaceLengths(points);
    grid = { support: outlineSupport(map, gridOutline(points)), bent: curvature(points) / Math.max(width, height) > CURVED };
  }
  const flat = (quad) => ({ kind: "perspective", corners: quad.corners });
  const clear = clearest(quads);
  if (clear && !(grid?.bent && grid.support >= CLEAR)) return flat(clear);
  if (borderedByPaper(map)) return null;
  if (grid?.bent && grid.support >= GRID) return { kind: "curved", points };
  const faint = quads.sort((a, b) => b.support - a.support)[0];
  return faint?.support >= FAINT ? flat(faint) : null;
}
