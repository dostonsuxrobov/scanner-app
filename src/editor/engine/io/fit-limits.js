// Largest size with the same aspect ratio that fits the editor's limits.
import { MAX_PIXELS, MAX_SIDE } from "../limits.js";

export function fitWithinLimits(width, height) {
  const scale = Math.min(1, MAX_SIDE / width, MAX_SIDE / height, Math.sqrt(MAX_PIXELS / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scaled: scale < 1,
  };
}
