// Zoom and pan commands for the viewport.
import { centerView, clampPan, fitView, stepZoom, zoomAt } from "../engine/view/viewport.js";

export function setView(rt, next) {
  const { width, height } = rt.view.getState();
  const doc = rt.session.doc;
  rt.view.setState(doc ? clampPan(next, doc.width, doc.height, width, height) : next);
}

export function fitToScreen(rt) {
  const doc = rt.session.doc;
  const { width, height } = rt.view.getState();
  if (!doc || !width) return;
  setView(rt, fitView(doc.width, doc.height, width, height, 32, 1));
}

export function actualPixels(rt) {
  const doc = rt.session.doc;
  const { width, height } = rt.view.getState();
  if (doc) setView(rt, centerView(doc.width, doc.height, width, height, 1));
}

// Zooms around a screen point (defaults to the viewport centre).
export function zoomTo(rt, zoom, anchor) {
  const view = rt.view.getState();
  const at = anchor ?? { x: view.width / 2, y: view.height / 2 };
  setView(rt, { ...view, ...zoomAt(view, zoom, at.x, at.y) });
}

export function zoomStep(rt, direction, anchor) {
  zoomTo(rt, stepZoom(rt.view.getState().zoom, direction), anchor);
}
