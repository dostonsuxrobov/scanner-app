// Whitens slivers of background (desk, table, hand) left along the edges of a
// flattened page, in place on cleaned RGBA data. A sliver is a region of
// non-paper pixels touching the outer edge that stays within a thin band;
// anything reaching past the band, such as a picture printed to the edge, is
// page content and kept.
const BAND = 0.04; // share of the page's width or height
const PAPER_LUMINANCE = 200;
const PAPER_CHROMA = 48;

function isPaper(data, p) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b >= PAPER_LUMINANCE && Math.max(r, g, b) - Math.min(r, g, b) < PAPER_CHROMA;
}

export function clearBorder(data, width, height) {
  const bx = Math.max(1, Math.round(width * BAND)), by = Math.max(1, Math.round(height * BAND));
  const inBand = (x, y) => x < bx || x >= width - bx || y < by || y >= height - by;
  const seen = new Uint8Array(width * height);
  const region = [];
  const stack = [];
  function visit(start) {
    region.length = 0;
    stack.push(start);
    seen[start] = 1;
    let deep = false;
    while (stack.length) {
      const i = stack.pop();
      region.push(i);
      const x = i % width, y = (i - x) / width;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (seen[n] || isPaper(data, n * 4)) continue;
        if (!inBand(nx, ny)) {
          deep = true;
          continue;
        }
        seen[n] = 1;
        stack.push(n);
      }
    }
    return !deep;
  }
  const edge = [];
  for (let x = 0; x < width; x++) edge.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) edge.push(y * width, y * width + width - 1);
  for (const i of edge) {
    if (seen[i] || isPaper(data, i * 4)) continue;
    if (!visit(i)) continue;
    for (const j of region) data[j * 4] = data[j * 4 + 1] = data[j * 4 + 2] = 255;
  }
  return data;
}
