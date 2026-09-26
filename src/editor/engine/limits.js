// Size limits that keep every buffer within what browsers can allocate reliably.
export const MAX_SIDE = 8000;
export const MAX_PIXELS = 36_000_000;
export const MAX_LAYERS = 50;

export function fitsLimits(width, height) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= MAX_SIDE &&
    height <= MAX_SIDE &&
    width * height <= MAX_PIXELS
  );
}

export function limitsMessage() {
  return `Images can be up to ${MAX_SIDE.toLocaleString()} px per side and ${Math.round(MAX_PIXELS / 1e6)} megapixels.`;
}
