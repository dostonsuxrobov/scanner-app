// Pure geometry for drawing and editing axis-aligned rectangles with handles.
const SIGNS = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };

// Rectangle dragged from `a` to `b`. `ratio` (w/h) constrains the shape;
// `fromCenter` treats `a` as the centre.
export function dragRect(a, b, { ratio = null, fromCenter = false } = {}) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (ratio) {
    const w = Math.max(Math.abs(dx), Math.abs(dy) * ratio);
    dx = Math.sign(dx || 1) * w;
    dy = Math.sign(dy || 1) * (w / ratio);
  }
  if (fromCenter) return { x: a.x - Math.abs(dx), y: a.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 };
  return { x: Math.min(a.x, a.x + dx), y: Math.min(a.y, a.y + dy), w: Math.abs(dx), h: Math.abs(dy) };
}

// Moves one handle of `rect` by (dx, dy); the opposite side stays fixed.
export function resizeRect(rect, handle, dx, dy, { ratio = null, fromCenter = false } = {}) {
  if (handle === "move") return { ...rect, x: rect.x + dx, y: rect.y + dy };
  const [sx, sy] = SIGNS[handle];
  const k = fromCenter ? 2 : 1;
  let w = rect.w + sx * dx * k;
  let h = rect.h + sy * dy * k;
  // Dragging past the opposite side flips the rectangle.
  let x = sx < 0 ? rect.x + rect.w - w : rect.x;
  let y = sy < 0 ? rect.y + rect.h - h : rect.y;
  if (fromCenter) {
    x = rect.x + rect.w / 2 - w / 2;
    y = rect.y + rect.h / 2 - h / 2;
  }
  if (!sx) (x = rect.x), (w = rect.w);
  if (!sy) (y = rect.y), (h = rect.h);
  if (ratio) {
    if (!sy || (sx && Math.abs(w) / ratio >= Math.abs(h))) {
      const nh = Math.abs(w) / ratio;
      y = sy < 0 ? rect.y + rect.h - nh : sy > 0 ? rect.y : rect.y + rect.h / 2 - nh / 2;
      h = nh;
    } else {
      const nw = Math.abs(h) * ratio;
      x = sx < 0 ? rect.x + rect.w - nw : sx > 0 ? rect.x : rect.x + rect.w / 2 - nw / 2;
      w = nw;
    }
  }
  if (w < 0) (x += w), (w = -w);
  if (h < 0) (y += h), (h = -h);
  return { x, y, w, h };
}
