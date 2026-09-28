// Size of the straightened page. Its true proportions are recovered from the
// perspective of the photo; near-standard paper (A4, US Letter) snaps to the
// exact ratio, and the result is brought to scanner-like resolution.
import { rectangleAspect } from "./aspect-ratio.js";

const PAPER_RATIOS = [
  [Math.SQRT2, "A4"],
  [11 / 8.5, "Letter"],
];
const SNAP_TOLERANCE = 0.05;
const MIN_LONG_SIDE = 1600; // ~150 ppi for a letter page
const MAX_LONG_SIDE = 3508; // A4 at 300 ppi
const MAX_UPSCALE = 2;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// corners: TL, TR, BR, BL in the photo, which is imageWidth × imageHeight.
export function pageSize(corners, imageWidth, imageHeight) {
  const [tl, tr, br, bl] = corners;
  const measured = Math.max(dist(tl, tr), dist(bl, br)) / Math.max(dist(tl, bl), dist(tr, br));
  const aspect = rectangleAspect(corners, imageWidth, imageHeight) ?? measured; // width / height
  const portrait = aspect <= 1;
  let ratio = portrait ? 1 / aspect : aspect; // long / short
  const paper = PAPER_RATIOS.find(([r]) => Math.abs(ratio - r) / r <= SNAP_TOLERANCE);
  if (paper) ratio = paper[0];
  const long = Math.max(dist(tl, tr), dist(bl, br), dist(tl, bl), dist(tr, br));
  const longSide = Math.round(Math.min(MAX_LONG_SIDE, Math.max(long, Math.min(MIN_LONG_SIDE, long * MAX_UPSCALE))));
  const shortSide = Math.round(longSide / ratio);
  return { width: portrait ? shortSide : longSide, height: portrait ? longSide : shortSide, paper: paper ? paper[1] : null };
}
