// Traces the boundary between selected (>= 50%) and unselected pixels as
// axis-aligned segments [x0, y0, x1, y1, ...], merging runs along each edge.
//
// Each row is reduced to its transition columns (where selected/unselected
// flips). Vertical edges are exactly those columns; horizontal edges between
// two rows are where the rows differ, i.e. the symmetric difference of their
// transition lists. Only the transition scan touches every pixel.
export function maskOutline(mask, width, height, bounds) {
  if (!bounds || !bounds.count) return new Int32Array(0);
  const x0 = bounds.x, x1 = bounds.x + bounds.w, y0 = bounds.y, y1 = bounds.y + bounds.h;
  let out = new Int32Array(4096);
  let n = 0;
  const emit = (a, b, c, d) => {
    if (n + 4 > out.length) {
      const grown = new Int32Array(out.length * 2);
      grown.set(out);
      out = grown;
    }
    out[n++] = a;
    out[n++] = b;
    out[n++] = c;
    out[n++] = d;
  };
  let prev = new Int32Array(x1 - x0 + 2);
  let cur = new Int32Array(x1 - x0 + 2);
  let prevCount = 0;
  const open = new Int32Array(x1 - x0 + 1).fill(-1); // start row of a vertical run per column

  for (let y = y0; y <= y1; y++) {
    // Transition columns of this row (none on the closing line).
    let count = 0;
    if (y < y1) {
      const base = y * width;
      let inside = 0;
      for (let x = x0; x < x1; x++) {
        const v = mask[base + x] >> 7;
        if (v !== inside) {
          cur[count++] = x;
          inside = v;
        }
      }
      if (inside) cur[count++] = x1;
    }
    // Horizontal edges: spans between consecutive columns of prev Δ cur.
    let i = 0, j = 0, start = -1;
    while (i < prevCount || j < count) {
      let x;
      if (j >= count || (i < prevCount && prev[i] < cur[j])) x = prev[i++];
      else if (i >= prevCount || cur[j] < prev[i]) x = cur[j++];
      else {
        i++;
        j++;
        continue; // in both: cancels out
      }
      if (start < 0) start = x;
      else {
        emit(start, y, x, y);
        start = -1;
      }
    }
    // Vertical edges: close runs that stopped, open runs that started.
    i = 0;
    j = 0;
    while (i < prevCount || j < count) {
      if (j >= count || (i < prevCount && prev[i] < cur[j])) {
        const x = prev[i++];
        emit(x, open[x - x0], x, y);
        open[x - x0] = -1;
      } else if (i >= prevCount || cur[j] < prev[i]) {
        open[cur[j++] - x0] = y;
      } else {
        i++;
        j++;
      }
    }
    [prev, cur] = [cur, prev];
    prevCount = count;
  }
  return out.slice(0, n);
}
