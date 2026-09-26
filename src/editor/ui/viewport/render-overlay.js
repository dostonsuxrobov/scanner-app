// Paints selection outlines and the active tool's handles/previews.
import { selectionSegments } from "../../engine/selection/selection.js";
import { drawMarchingAnts } from "../../overlay/marching-ants.js";

export function renderOverlay(ctx, rt, { dpr, phase }) {
  const view = rt.view.getState();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  if (!rt.session.hasDocument) return;
  const tool = rt.tool;
  const selection = rt.session.selection;
  if (selection?.count && !tool?.hideAnts?.()) {
    const offset = tool?.antsOffset?.();
    const shifted = offset ? { ...view, x: view.x + offset.dx * view.zoom, y: view.y + offset.dy * view.zoom } : view;
    drawMarchingAnts(ctx, selectionSegments(selection), shifted, phase);
  }
  tool?.overlay?.(rt, ctx, view, phase);
}
