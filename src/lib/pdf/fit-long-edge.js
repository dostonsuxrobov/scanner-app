// Scales width/height down (never up) so the longer side is at most maxLongEdge, keeping aspect ratio.
export function fitLongEdge(width, height, maxLongEdge) {
  const k = Math.min(1, maxLongEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}
