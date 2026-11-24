// Paints the active layer's boundary, selection outlines, and the active
// tool's handles/previews.
import { selectionSegments } from "../../engine/selection/selection.js";
import { createAntsLayer } from "../../overlay/ants-layer.js";
import { drawLayerBoundary } from "../../overlay/layer-boundary.js";

const paintAnts = createAntsLayer();

export function renderOverlay(ctx, rt, { dpr, phase }) {
  const view = rt.view.getState();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  if (!rt.session.hasDocument) return;
  const tool = rt.tool;
  const { transform, crop, textEdit } = rt.store.getState();
  const layer = rt.session.activeLayer;
  // A pending transform, crop, or text edit draws its own frame instead.
  if (layer && !transform && !crop && !textEdit) drawLayerBoundary(ctx, layer, rt.session.doc, view);
  const selection = rt.session.selection;
  if (selection?.count && !tool?.hideAnts?.()) {
    const offset = tool?.antsOffset?.();
    const shifted = offset ? { ...view, x: view.x + offset.dx * view.zoom, y: view.y + offset.dy * view.zoom } : view;
    paintAnts(ctx, selectionSegments(selection), shifted, phase, dpr);
  }
  tool?.overlay?.(rt, ctx, view, phase);
}
