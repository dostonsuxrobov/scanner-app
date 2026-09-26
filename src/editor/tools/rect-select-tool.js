// Rectangle Select: drag to select; drag handles or the inside of the last
// rectangle to adjust it. Modifiers at the start pick the mode (Shift add,
// Alt/Ctrl subtract, both intersect); during the drag Shift makes a square
// and Alt draws from the centre.
import { dragRect, resizeRect } from "../engine/rect-resize.js";
import { roundRect } from "../engine/rect.js";
import { combineMasks, featherMask, shapeMask } from "../engine/selection/mask.js";
import { createSelection } from "../engine/selection/selection.js";
import { drawDashedPolygon } from "../overlay/marching-ants.js";
import { drawHandles, handleCursor, handlePoints, hitHandle, pointInPolygon, rectCorners } from "../overlay/handles.js";
import { drawLabel } from "../overlay/label.js";
import { selectionMode } from "./helpers/selection-mode.js";

export function buildRectSelection(doc, rect, options, mode, base) {
  const r = roundRect(rect);
  let mask = shapeMask(doc.width, doc.height, r, { radius: options.radius });
  mask = featherMask(mask, doc.width, doc.height, options.feather);
  const combined = combineMasks(base?.mask, mask, mode);
  const shape = mode === "replace" ? { type: "rect", rect: r, radius: options.radius, feather: options.feather } : null;
  return createSelection(combined, doc.width, doc.height, shape);
}

const styleRatio = (o) => (o.style === "ratio" && o.ratioW > 0 && o.ratioH > 0 ? o.ratioW / o.ratioH : null);

export function createRectSelectTool() {
  let drag = null;

  const editableShape = (rt) => {
    const shape = rt.session.selection?.shape;
    return shape?.type === "rect" ? shape : null;
  };

  function hit(rt, e) {
    const shape = editableShape(rt);
    if (!shape) return null;
    const view = rt.view.getState();
    const corners = rectCorners(shape.rect, view);
    return hitHandle(handlePoints(corners), e.sx, e.sy) ?? (pointInPolygon(corners, e.sx, e.sy) ? "move" : null);
  }

  return {
    id: "select",
    get dragging() {
      return !!drag;
    },

    cursor(rt, e) {
      if (drag) return drag.handle && drag.handle !== "move" ? handleCursor(drag.handle) : "crosshair";
      const h = e && !e.shift && !e.alt && !e.mod && rt.options("select").mode === "replace" ? hit(rt, e) : null;
      return h === "move" ? "move" : h ? handleCursor(h) : "crosshair";
    },

    down(rt, e) {
      const options = rt.options("select");
      const handle = !e.shift && !e.alt && !e.mod && options.mode === "replace" ? hit(rt, e) : null;
      if (handle) {
        drag = { kind: "edit", handle, start: e, original: editableShape(rt).rect, rect: editableShape(rt).rect };
        return;
      }
      const mode = selectionMode(e, options.mode);
      drag = {
        kind: "new",
        start: e,
        mode,
        base: rt.session.selection,
        // Modifiers used to pick the mode don't also constrain the shape.
        modifiersAtStart: { shift: e.shift, alt: e.alt },
        rect: options.style === "fixed" ? { x: e.x, y: e.y, w: options.fixedW, h: options.fixedH } : null,
      };
      rt.redrawOverlay();
    },

    move(rt, e) {
      if (!drag) return;
      const options = rt.options("select");
      if (drag.kind === "edit") {
        drag.rect = resizeRect(drag.original, drag.handle, e.x - drag.start.x, e.y - drag.start.y, {
          ratio: styleRatio(options) ?? (e.shift ? drag.original.w / drag.original.h : null),
          fromCenter: e.alt,
        });
      } else if (options.style === "fixed") {
        drag.rect = { x: e.x, y: e.y, w: options.fixedW, h: options.fixedH };
      } else {
        const square = e.shift && !drag.modifiersAtStart.shift;
        drag.rect = dragRect(drag.start, e, {
          ratio: styleRatio(options) ?? (square ? 1 : null),
          fromCenter: e.alt && !drag.modifiersAtStart.alt,
        });
      }
      rt.redrawOverlay();
    },

    up(rt) {
      if (!drag) return;
      const { session } = rt;
      const options = rt.options("select");
      const rect = drag.rect && roundRect(drag.rect);
      const tiny = !rect || rect.w < 1 || rect.h < 1;
      if (drag.kind === "edit") {
        if (!tiny) session.setSelection(buildRectSelection(session.doc, rect, editableShape(rt) ?? options, "replace", null), "Adjust selection");
      } else if (tiny) {
        // A plain click clears the selection, as in every major editor.
        if (drag.mode === "replace" && session.selection) session.setSelection(null, "Deselect");
      } else session.setSelection(buildRectSelection(session.doc, rect, options, drag.mode, drag.base), "Rectangle select");
      drag = null;
      rt.redrawOverlay();
    },

    cancel(rt) {
      drag = null;
      rt.redrawOverlay();
    },

    // Replaces the editable rectangle from the numeric fields.
    setRect(rt, rect) {
      const shape = editableShape(rt);
      if (!shape || rect.w < 1 || rect.h < 1) return;
      rt.session.setSelection(buildRectSelection(rt.session.doc, rect, shape, "replace", null), "Adjust selection");
    },

    hideAnts() {
      return drag?.kind === "edit";
    },

    overlay(rt, ctx, view, phase) {
      if (drag?.rect) {
        const corners = rectCorners(roundRect(drag.rect), view);
        drawDashedPolygon(ctx, corners, phase);
        const r = roundRect(drag.rect);
        drawLabel(ctx, `${r.w} × ${r.h}`, corners[2].x, corners[2].y);
        return;
      }
      const shape = editableShape(rt);
      if (shape && rt.options("select").mode === "replace") drawHandles(ctx, handlePoints(rectCorners(shape.rect, view)));
    },
  };
}
