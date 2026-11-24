// Size of a manual perspective crop: as many pixels as the selection's
// longest side holds, in the true proportions of the rectangle that was
// photographed (not the proportions of its foreshortened outline).
import { rectangleAspect } from "./aspect-ratio.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// corners: TL, TR, BR, BL in pixels of an image of imageWidth × imageHeight.
export function cropSize(corners, imageWidth, imageHeight) {
  const [tl, tr, br, bl] = corners;
  const across = Math.max(dist(tl, tr), dist(bl, br)), down = Math.max(dist(tl, bl), dist(tr, br));
  const aspect = rectangleAspect(corners, imageWidth, imageHeight) ?? across / down;
  const long = Math.max(across, down);
  return aspect >= 1
    ? { width: Math.round(long), height: Math.max(1, Math.round(long / aspect)) }
    : { width: Math.max(1, Math.round(long * aspect)), height: Math.round(long) };
}
