// Transform (scale, rotate, flip) for the active layer, or for the selected
// pixels, which are first floated into their own layer. Drag handles to
// scale (Shift toggles aspect lock, Alt scales from the centre), drag inside
// to move, drag outside to rotate (Shift snaps to 15°). Enter applies, Esc
// cancels, and switching tools applies.
import { layerBounds } from "../engine/layer.js";
import { contentBounds, cropCanvas } from "../engine/content-bounds.js";
import { union } from "../engine/rect.js";
import { rasterizeDraft } from "../engine/transform/rasterize-draft.js";
import {
  createDraft, draftBounds, draftCorners, draftMatrix, isIdentity, resizeDraft, rotateDraft,
} from "../engine/transform/transform-draft.js";
import { docToScreen } from "../engine/view/viewport.js";
import { drawHandles, handleCursor, handlePoints, hitHandle, pointInPolygon, strokeOutline } from "../overlay/handles.js";
import { drawLabel } from "../overlay/label.js";
import { ROTATE_CURSOR } from "../overlay/rotate-cursor.js";
import { editableLayer } from "./helpers/editable-layer.js";
import { liftRect, liftSelection } from "./helpers/lift-selection.js";

export function createTransformTool() {
  let drag = null; // { kind: handle | "move" | "rotate", start, original }

  const draftOf = (rt) => rt.store.getState().transform;

  function show(rt, draft, previous = null) {
    rt.store.setState({ transform: draft });
    const smoothing = rt.options("scale").smoothing;
    const damage = previous ? union(draftBounds(previous), draftBounds(draft)) : null;
    rt.setLive({ transform: { layerId: draft.layerId, source: draft.source, matrix: draftMatrix(draft), smoothing } }, damage);
  }

  function hit(rt, e) {
    const draft = draftOf(rt);
    if (!draft) return null;
    const view = rt.view.getState();
    const corners = draftCorners(draft).map((p) => docToScreen(view, p.x, p.y));
    return hitHandle(handlePoints(corners), e.sx, e.sy) ?? (pointInPolygon(corners, e.sx, e.sy) ? "move" : "rotate");
  }

  const tool = {
    id: "scale",

    // Starts a transform of the active layer (or its selected pixels).
    begin(rt) {
      const { session } = rt;
      if (!session.doc || draftOf(rt)) return;
      let layer = editableLayer(rt);
      if (!layer) return;
      const selection = session.selection;
      if (selection?.count) {
        if (layer.alphaLocked) return rt.toast(`Unlock transparency of “${layer.name}” to transform selected pixels.`, true);
        const tx = session.begin("Float selection");
        tx.capture(layer, liftRect(layer, selection));
        layer = liftSelection(session.doc, layer, selection, { name: "Transformed pixels" });
        if (!layer) {
          session.cancel(tx);
          return rt.toast("The selection does not cover any pixels of this layer.", true);
        }
        session.selection = null;
        session.end(tx);
      }
      // Frame only the visible pixels, as Photoshop's Free Transform does.
      const bounds = contentBounds(layer.canvas);
      if (!bounds) return rt.toast(`“${layer.name}” is empty — there is nothing to transform.`, true);
      const whole = bounds.w === layer.canvas.width && bounds.h === layer.canvas.height;
      const source = whole ? layer.canvas : cropCanvas(layer.canvas, bounds);
      show(rt, createDraft(layer.id, source, layer.x + bounds.x, layer.y + bounds.y));
    },

    update(rt, draft) {
      const previous = draftOf(rt);
      if (previous) show(rt, draft, previous);
    },

    apply(rt) {
      const draft = draftOf(rt);
      if (!draft) return true;
      const { session } = rt;
      const layer = session.layer(draft.layerId);
      rt.store.setState({ transform: null });
      if (!layer || isIdentity(draft)) {
        rt.setLive(null);
        return true;
      }
      try {
        const result = rasterizeDraft(draft, { smoothing: rt.options("scale").smoothing });
        const before = layerBounds(layer);
        session.edit("Transform", () => {
          layer.canvas = result.canvas;
          layer.x = result.x;
          layer.y = result.y;
        });
        rt.setLive(null, union(before, layerBounds(layer)));
        return true;
      } catch (error) {
        rt.toast(error.message, true);
        rt.store.setState({ transform: draft });
        return false;
      }
    },

    discard(rt) {
      if (!draftOf(rt)) return;
      rt.store.setState({ transform: null });
      rt.setLive(null);
    },

    activate(rt) {
      tool.begin(rt);
    },
    deactivate(rt) {
      tool.apply(rt);
    },

    cursor(rt, e) {
      const draft = draftOf(rt);
      const h = drag?.kind ?? (e ? hit(rt, e) : null);
      if (!h || h === "move") return "move";
      if (h === "rotate") return ROTATE_CURSOR;
      return handleCursor(h, draft?.angle ?? 0);
    },

    down(rt, e) {
      if (!draftOf(rt)) return tool.begin(rt);
      drag = { kind: hit(rt, e), start: e, original: draftOf(rt) };
    },

    move(rt, e) {
      if (!drag) return;
      const { original, start, kind } = drag;
      let next;
      if (kind === "move") next = { ...original, cx: original.cx + (e.x - start.x), cy: original.cy + (e.y - start.y) };
      else if (kind === "rotate") next = rotateDraft(original, start, e, e.shift);
      else next = resizeDraft(original, kind, e, { keepAspect: rt.options("scale").keepAspect !== e.shift, fromCenter: e.alt });
      drag.pointer = e;
      tool.update(rt, next);
    },

    up() {
      drag = null;
    },

    cancel() {
      drag = null;
    },

    key(rt, event) {
      if (!draftOf(rt)) return false;
      if (event.key === "Enter") {
        tool.apply(rt);
        return true;
      }
      if (event.key === "Escape") {
        tool.discard(rt);
        return true;
      }
      return false;
    },

    // Undo while a transform is pending cancels the transform instead.
    interceptUndo(rt) {
      if (!draftOf(rt)) return false;
      tool.discard(rt);
      return true;
    },

    overlay(rt, ctx, view) {
      const draft = draftOf(rt);
      if (!draft) return;
      const corners = draftCorners(draft).map((p) => docToScreen(view, p.x, p.y));
      strokeOutline(ctx, corners);
      drawHandles(ctx, handlePoints(corners));
      const c = docToScreen(view, draft.cx, draft.cy);
      ctx.save();
      ctx.strokeStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (drag?.pointer) {
        const text = drag.kind === "rotate" ? `${Math.round(draft.angle * 10) / 10}°` : `${Math.round(draft.w)} × ${Math.round(draft.h)}`;
        drawLabel(ctx, text, drag.pointer.sx, drag.pointer.sy);
      }
    },
  };
  return tool;
}
