// Synthetic "phone photo" of a page for document-pipeline tests: a page with
// dark text lines and a lighting gradient, in perspective on a darker desk.
import { computePerspectiveTransform } from "../src/lib/document/perspective.js";

// Projects a flat page (width × height units) through a pinhole camera:
// rotated by `tilt` about x and `turn` about y (radians), `distance` away.
export function projectPage({ page = [210, 297], tilt = 0.5, turn = 0.25, roll = 0.08, distance = 520, focal = 700, image = [800, 600] }) {
  const [pw, ph] = page;
  return [[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]].map(([x, y]) => {
    let X = x * Math.cos(roll) - y * Math.sin(roll), Y = x * Math.sin(roll) + y * Math.cos(roll), Z = 0;
    [Y, Z] = [Y * Math.cos(tilt) - Z * Math.sin(tilt), Y * Math.sin(tilt) + Z * Math.cos(tilt)];
    [X, Z] = [X * Math.cos(turn) + Z * Math.sin(turn), -X * Math.sin(turn) + Z * Math.cos(turn)];
    Z += distance;
    return { x: image[0] / 2 + (focal * X) / Z, y: image[1] / 2 + (focal * Y) / Z };
  });
}

export function photo({ width = 800, height = 600, corners, desk = 70, paper = 235, shadow = 0.55, seed = 3 }) {
  let s = seed;
  const noise = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 10;
  const H = computePerspectiveTransform(corners, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const d = H[6] * x + H[7] * y + 1;
      const u = (H[0] * x + H[1] * y + H[2]) / d;
      const v = (H[3] * x + H[4] * y + H[5]) / d;
      let value = desk + noise();
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        // Light falls off towards the right: a soft shadow across the page.
        const light = 1 - shadow * u * u;
        const ink = u > 0.1 && u < 0.9 && v > 0.1 && v < 0.9 && (v * 30) % 1 < 0.35;
        value = (ink ? 25 : paper) * light + noise();
      }
      data.set([value, value, value * 0.97, 255], (y * width + x) * 4);
    }
  return data;
}

// Luminances of a page-space rectangle [u0,u1]×[v0,v1], sorted ascending.
export function lumsIn(data, width, height, [u0, u1, v0, v1]) {
  const out = [];
  for (let y = Math.floor(v0 * height); y < Math.floor(v1 * height); y++)
    for (let x = Math.floor(u0 * width); x < Math.floor(u1 * width); x++) {
      const p = (y * width + x) * 4;
      out.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    }
  return out.sort((a, b) => a - b);
}

const mean = (list) => list.reduce((s, v) => s + v, 0) / list.length;
// Mean of the darkest / brightest `fraction` of a sorted list.
export const darkest = (sorted, fraction) => mean(sorted.slice(0, Math.max(1, Math.floor(sorted.length * fraction))));
export const brightest = (sorted, fraction) => mean(sorted.slice(-Math.max(1, Math.floor(sorted.length * fraction))));
