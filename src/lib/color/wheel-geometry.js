// Maps between a point on a color wheel and its hue/saturation.
// Hue runs around the circle (0° = right, counter-clockwise); saturation grows from center (0) to rim (1).

export function pointToHueSat(x, y, radius) {
  const dx = x - radius;
  const dy = radius - y;
  const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const s = Math.min(1, Math.hypot(dx, dy) / radius);
  return { h, s };
}

export function hueSatToPoint(h, s, radius) {
  const a = (h * Math.PI) / 180;
  return { x: radius + Math.cos(a) * s * radius, y: radius - Math.sin(a) * s * radius };
}
