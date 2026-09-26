// Crop: starts with the whole image (or the selection) framed. Drag handles
// or edges to adjust, drag inside to move, drag outside to draw a new box.
// Enter crops, Esc resets. The box may extend past the image to enlarge it.
import { cropDocument } from "../engine/crop-document.js";
import { dragRect, resizeRect } from "../engine/rect-resize.js";
import { roundRect } from "../engine/rect.js";
import { drawCropGuides, drawCropShield } from "../overlay/crop-shield.js";
import { drawHandles, handleCursor, handlePoints, hitHandle, pointInPolygon, rectCorners, strokeOutline } from "../overlay/handles.js";
import { drawLabel } from "../overlay/label.js";
import { cropRatio, fitRatio } from "./crop-ratios.js";

export function createCropTool({ onCropped }) {
  let drag = null;

  const rectOf = (rt) => rt.store.getState().crop?.rect ?? null;
  const setRect = (rt, rect) => {
    rt.store.setState({ crop: { rect } });
    rt.redrawOverlay();
  };

  function hit(rt, e) {
    const rect = rectOf(rt);
    if (!rect) return null;
    const corners = rectCorners(rect, rt.view.getState());
    return hitHandle(handlePoints(corners), e.sx, e.sy) ?? (pointInPolygon(corners, e.sx, e.sy) ? "move" : null);
  }

  const tool = {
    id: "crop",

    // Frames the selection if there is one, otherwise the image (at the ratio).
    reset(rt) {
      const doc = rt.session.doc;
      if (!doc) return;
      const selection = rt.session.selection;
      const ratio = cropRatio(rt.options("crop"), doc);
      setRect(rt, selection?.count && !ratio ? { ...selection.bounds } : fitRatio(doc, ratio));
    },

    activate(rt) {
      tool.reset(rt);
    },
    deactivate(rt) {
      drag = null;
      rt.store.setState({ crop: null });
      rt.redrawOverlay();
    },

    cursor(rt, e) {
      const h = drag?.handle ?? (e ? hit(rt, e) : null);
      if (h === "move") return "move";
      return h ? handleCursor(h) : "crosshair";
    },

    down(rt, e) {
      if (!rectOf(rt)) tool.reset(rt);
      const handle = hit(rt, e);
      drag = handle ? { handle, start: e, original: rectOf(rt) } : { handle: null, start: e };
    },

    move(rt, e) {
      if (!drag) return;
      const ratio = cropRatio(rt.options("crop"), rt.session.doc) ?? (e.shift ? (drag.original ? drag.original.w / drag.original.h : 1) : null);
      const rect = drag.handle
        ? resizeRect(drag.original, drag.handle, e.x - drag.start.x, e.y - drag.start.y, { ratio: drag.handle === "move" ? null : ratio, fromCenter: e.alt })
        : dragRect(drag.start, e, { ratio, fromCenter: e.alt });
      drag.pointer = e;
      setRect(rt, rect);
    },

    up(rt) {
      const rect = rectOf(rt);
      if (rect && (rect.w < 1 || rect.h < 1)) tool.reset(rt);
      drag = null;
      rt.redrawOverlay();
    },

    cancel() {
      drag = null;
    },

    apply(rt) {
      const rect = rectOf(rt) && roundRect(rectOf(rt));
      if (!rect || rect.w < 1 || rect.h < 1) return;
      const { session } = rt;
      const doc = session.doc;
      if (rect.x === 0 && rect.y === 0 && rect.w === doc.width && rect.h === doc.height) return;
      const locked = doc.layers.find((l) => l.locked);
      if (locked) return rt.toast(`Unlock “${locked.name}” before cropping.`, true);
      session.edit("Crop", (d) => {
        cropDocument(d, rect, { deletePixels: rt.options("crop").deletePixels });
        session.selection = null;
      });
      onCropped(rt);
      tool.reset(rt);
    },

    key(rt, event) {
      if (event.key === "Enter") {
        tool.apply(rt);
        return true;
      }
      if (event.key === "Escape") {
        tool.reset(rt);
        return true;
      }
      return false;
    },

    hideAnts: () => true,

    overlay(rt, ctx, view) {
      const rect = rectOf(rt);
      if (!rect) return;
      const corners = rectCorners(rect, view);
      drawCropShield(ctx, corners, view.width, view.height);
      drawCropGuides(ctx, corners, rt.options("crop").guides);
      strokeOutline(ctx, corners, "#ffffff");
      drawHandles(ctx, handlePoints(corners));
      const r = roundRect(rect);
      const at = drag?.pointer ?? { sx: corners[2].x, sy: corners[2].y };
      drawLabel(ctx, `${r.w} × ${r.h}`, at.sx, at.sy);
    },
  };
  return tool;
}
