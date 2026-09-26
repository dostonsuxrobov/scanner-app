// A layer-sized transparent canvas that collects one stroke or shape.
// Opacity, erasing, and selection clipping apply only when it is merged, so
// overlapping dabs never build up beyond the chosen opacity.
import { createCanvas } from "../canvas.js";
import { union, roundOut, intersect } from "../rect.js";

export function createStrokeBuffer(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  let bounds = { x: 0, y: 0, w: 0, h: 0 };
  const area = { x: 0, y: 0, w: width, h: height };

  return {
    canvas,
    ctx,
    get bounds() {
      return bounds;
    },
    // Stamps dabs (layer coordinates) and returns the damaged rect.
    stamp(tip, dabs, sizeFor = () => 1) {
      let damage = { x: 0, y: 0, w: 0, h: 0 };
      for (const dab of dabs) {
        const scale = sizeFor(dab);
        const r = tip.radius * scale;
        ctx.drawImage(tip.canvas, dab.x - r, dab.y - r, r * 2, r * 2);
        damage = union(damage, roundOut({ x: dab.x - r, y: dab.y - r, w: r * 2, h: r * 2 }));
      }
      damage = intersect(damage, area);
      bounds = union(bounds, damage);
      return damage;
    },
    // Replaces the contents with a single drawing (used by shape previews).
    redraw(draw) {
      const previous = bounds;
      ctx.clearRect(0, 0, width, height);
      const drawn = draw(ctx);
      bounds = drawn ? intersect(roundOut(drawn), area) : { x: 0, y: 0, w: 0, h: 0 };
      return union(previous, bounds);
    },
    clear() {
      ctx.clearRect(0, 0, width, height);
      bounds = { x: 0, y: 0, w: 0, h: 0 };
    },
  };
}
