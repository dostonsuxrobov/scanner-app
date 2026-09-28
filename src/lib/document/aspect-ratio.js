// True width/height of a rectangle photographed in perspective, from its four
// image corners (Zhang & He, "Whiteboard scanning and image enhancement",
// 2007). The camera's focal length is recovered from the corners, assuming
// square pixels and the principal point at the image centre. When the view
// has no measurable perspective, the affine estimate is used instead.
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Real cameras have focal lengths between wide-angle and telephoto; a
// solution outside this range (in image diagonals) means the corners don't fit
// the camera model well, so the affine estimate is safer.
const FOCAL_RANGE = [0.3, 3];

// corners: TL, TR, BR, BL in pixels of an image of imageWidth × imageHeight.
export function rectangleAspect([tl, tr, br, bl], imageWidth, imageHeight) {
  const u0 = imageWidth / 2, v0 = imageHeight / 2;
  const h = (p) => [p.x - u0, p.y - v0, 1];
  const m1 = h(tl), m2 = h(tr), m3 = h(bl), m4 = h(br);
  const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
  const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]);
  const n3 = m3.map((v, i) => k3 * v - m1[i]);
  const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]);
  const focal = Math.sqrt(f2) / Math.hypot(imageWidth, imageHeight);
  const perspective =
    Number.isFinite(f2) && f2 > 0 && focal >= FOCAL_RANGE[0] && focal <= FOCAL_RANGE[1] &&
    Math.abs(n2[2]) > 1e-6 && Math.abs(n3[2]) > 1e-6;
  const len2 = (n) => (perspective ? (n[0] ** 2 + n[1] ** 2) / f2 + n[2] ** 2 : n[0] ** 2 + n[1] ** 2);
  const ratio = Math.sqrt(len2(n2) / len2(n3));
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}
