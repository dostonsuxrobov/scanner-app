// Pure pan/zoom math. A view maps document to screen: screen = doc * zoom + offset.
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 64;
export const ZOOM_STEPS = [
  0.01, 0.02, 0.03, 0.05, 0.0625, 0.0833, 0.125, 0.1667, 0.25, 0.3333, 0.5, 0.6667,
  1, 1.5, 2, 3, 4, 5.5, 8, 11, 16, 23, 32, 45, 64,
];

export const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const screenToDoc = (view, sx, sy) => ({ x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom });

export const docToScreen = (view, x, y) => ({ x: x * view.zoom + view.x, y: y * view.zoom + view.y });

// Zooms while keeping the document point under (sx, sy) fixed.
export function zoomAt(view, zoom, sx, sy) {
  const next = clampZoom(zoom);
  const p = screenToDoc(view, sx, sy);
  return { zoom: next, x: sx - p.x * next, y: sy - p.y * next };
}

export function stepZoom(zoom, direction) {
  if (direction > 0) return ZOOM_STEPS.find((z) => z > zoom * 1.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((z) => z < zoom / 1.001) ?? MIN_ZOOM;
}

export function fitView(docW, docH, viewW, viewH, padding = 32, maxZoom = 1) {
  const zoom = clampZoom(
    Math.min(maxZoom, (viewW - padding * 2) / docW, (viewH - padding * 2) / docH),
  );
  return centerView(docW, docH, viewW, viewH, zoom);
}

export function centerView(docW, docH, viewW, viewH, zoom) {
  return { zoom, x: Math.round((viewW - docW * zoom) / 2), y: Math.round((viewH - docH * zoom) / 2) };
}

// Keeps part of the document on screen so it can never be panned out of reach.
export function clampPan(view, docW, docH, viewW, viewH, keep = 48) {
  const w = docW * view.zoom;
  const h = docH * view.zoom;
  const minKeepX = Math.min(keep, w);
  const minKeepY = Math.min(keep, h);
  return {
    ...view,
    x: Math.min(viewW - minKeepX, Math.max(minKeepX - w, view.x)),
    y: Math.min(viewH - minKeepY, Math.max(minKeepY - h, view.y)),
  };
}

// Wheel delta → zoom factor; smooth for trackpads, stepped feel for mice.
export function wheelZoomFactor(deltaY, deltaMode) {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.exp(-Math.max(-120, Math.min(120, pixels)) * 0.0025);
}

export function formatZoom(zoom) {
  const percent = zoom * 100;
  return `${percent < 10 ? percent.toFixed(1).replace(/\.0$/, "") : Math.round(percent)}%`;
}
