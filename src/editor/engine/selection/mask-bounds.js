// Bounding box and pixel count of a mask's non-zero coverage.
export function maskBounds(mask, width, height) {
  let left = width, top = height, right = -1, bottom = -1, count = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let first = -1, last = -1;
    for (let x = 0; x < width; x++)
      if (mask[row + x]) {
        if (first < 0) first = x;
        last = x;
        count++;
      }
    if (first < 0) continue;
    if (first < left) left = first;
    if (last > right) right = last;
    if (y < top) top = y;
    bottom = y;
  }
  return count
    ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1, count }
    : { x: 0, y: 0, w: 0, h: 0, count: 0 };
}
