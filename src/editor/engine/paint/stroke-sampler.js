// Turns raw pointer samples into evenly spaced brush dabs.
// Smoothing is a "lazy" stabilizer: the brush trails the pointer and catches
// up when the stroke ends, which removes hand jitter without losing the end.
export function createStrokeSampler({ spacing, smoothing = 0 }) {
  const lag = Math.min(0.95, Math.max(0, smoothing / 100)) * 0.9;
  let smooth = null; // stabilized pointer
  let last = null; // last emitted dab
  let carry = 0; // distance travelled since the last dab

  function walk(to, dabs) {
    if (!last) {
      last = { ...to };
      dabs.push({ ...to });
      return;
    }
    const dx = to.x - last.x;
    const dy = to.y - last.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    let travelled = spacing - carry;
    const from = last;
    while (travelled <= length) {
      const t = travelled / length;
      dabs.push({
        x: from.x + dx * t,
        y: from.y + dy * t,
        pressure: from.pressure + (to.pressure - from.pressure) * t,
      });
      travelled += spacing;
    }
    carry = length - (travelled - spacing);
    last = { ...to };
  }

  return {
    add(point) {
      const p = { x: point.x, y: point.y, pressure: point.pressure ?? 1 };
      smooth = smooth
        ? {
            x: smooth.x + (p.x - smooth.x) * (1 - lag),
            y: smooth.y + (p.y - smooth.y) * (1 - lag),
            pressure: p.pressure,
          }
        : p;
      const dabs = [];
      walk(smooth, dabs);
      this.target = p;
      return dabs;
    },
    // Draws the remaining distance to where the pointer actually stopped.
    finish() {
      const dabs = [];
      if (this.target && lag > 0) walk(this.target, dabs);
      return dabs;
    },
    target: null,
  };
}

export const dabSpacing = (diameter, hardness) =>
  Math.max(0.5, diameter * (hardness >= 100 ? 0.1 : 0.15));
