// Renders a round brush tip. Hardness sets where the soft falloff begins.
import { createCanvas } from "../canvas.js";

const cache = new Map();

export function brushTip(diameter, hardness, color) {
  const size = Math.max(1, diameter);
  const key = `${size.toFixed(2)}|${hardness}|${color}`;
  let tip = cache.get(key);
  if (tip) return tip;
  const side = Math.ceil(size) + 2;
  const canvas = createCanvas(side, side);
  const ctx = canvas.getContext("2d");
  const c = side / 2;
  const r = size / 2;
  if (hardness >= 100 || r < 1.5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const gradient = ctx.createRadialGradient(c, c, r * (hardness / 100), c, c, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, hexWithAlpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, side, side);
  }
  tip = { canvas, radius: side / 2 };
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  cache.set(key, tip);
  return tip;
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
