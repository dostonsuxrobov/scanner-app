// Rectangle and Ellipse. The shape previews exactly as it will be committed;
// Shift makes a square/circle and Alt draws from the centre. By default each
// shape goes on its own new layer so it can still be moved or restyled.
import { createCanvas } from "../engine/canvas.js";
import { createLayer } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { drawShape, shapeColors } from "../engine/paint/draw-shape.js";
import { createStrokeBuffer } from "../engine/paint/stroke-buffer.js";
import { applyStroke } from "../engine/paint/apply-stroke.js";
import { dragRect } from "../engine/rect-resize.js";
import { isEmptyRect, translate } from "../engine/rect.js";
import { selectionCanvas } from "../engine/selection/selection.js";
import { docToScreen } from "../engine/view/viewport.js";
import { drawLabel } from "../overlay/label.js";
import { editableLayer } from "./helpers/editable-layer.js";

export function createShapeTool(kind) {
  let drag = null; // { start, target: { layer, isNew }, merge, rect }

  // A fresh transparent layer, or the active layer, to receive the shape.
  function target(rt) {
    const { session } = rt;
    if (rt.options(kind).newLayer) {
      if (session.doc.layers.length >= MAX_LAYERS) {
        rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
        return null;
      }
      const { width, height } = session.doc;
      return { layer: createLayer(kind === "ellipse" ? "Ellipse" : "Rectangle", createCanvas(width, height)), isNew: true };
    }
    const layer = editableLayer(rt);
    return layer && { layer, isNew: false };
  }

  return {
    id: kind,
    cursor: () => "crosshair",

    down(rt, e) {
      const t = target(rt);
      if (!t) return;
      const { layer } = t;
      const selection = rt.session.selection;
      const merge = {
        buffer: createStrokeBuffer(layer.canvas.width, layer.canvas.height),
        mode: "paint",
        opacity: rt.options(kind).opacity / 100,
        alphaLocked: !t.isNew && layer.alphaLocked,
        clip: selection ? selectionCanvas(selection) : null,
        layerX: layer.x,
        layerY: layer.y,
      };
      drag = { start: e, target: t, merge, rect: null, pointer: e };
      // A new layer previews in the stack position it will be inserted at.
      rt.setLive(
        t.isNew
          ? { insert: { afterId: rt.session.doc.activeId, layer, stroke: merge } }
          : { paint: { layerId: layer.id, stroke: merge } },
        { x: 0, y: 0, w: 0, h: 0 },
      );
    },

    move(rt, e) {
      if (!drag) return;
      const o = rt.options(kind);
      const { layer } = drag.target;
      drag.pointer = e;
      drag.rect = dragRect(drag.start, e, { ratio: e.shift ? 1 : null, fromCenter: e.alt });
      const local = translate(drag.rect, -layer.x, -layer.y);
      const colors = shapeColors(o.style, rt.store.getState().colors);
      const damage = drag.merge.buffer.redraw((ctx) => drawShape(ctx, kind, local, o, colors));
      rt.invalidate(translate(damage, layer.x, layer.y));
    },

    up(rt) {
      if (!drag) return;
      const { session } = rt;
      const { layer, isNew } = drag.target;
      const bounds = drag.merge.buffer.bounds;
      if (drag.rect && drag.rect.w >= 1 && drag.rect.h >= 1 && !isEmptyRect(bounds)) {
        const tx = session.begin(kind === "ellipse" ? "Ellipse" : "Rectangle");
        if (isNew) {
          // The new layer is only as large as the shape.
          layer.canvas = createCanvas(bounds.w, bounds.h);
          layer.x = bounds.x;
          layer.y = bounds.y;
          applyStroke(layer.canvas.getContext("2d"), bounds, drag.merge, bounds.x, bounds.y);
          const doc = session.doc;
          const anchor = doc.layers.findIndex((l) => l.id === doc.activeId);
          doc.layers.splice(anchor + 1, 0, layer);
          doc.activeId = layer.id;
        } else {
          tx.capture(layer, bounds);
          applyStroke(layer.canvas.getContext("2d"), bounds, drag.merge);
        }
        tx.damage = isNew ? { ...bounds } : translate(bounds, layer.x, layer.y);
        rt.setLive(null, tx.damage);
        session.end(tx);
      } else rt.setLive(null);
      drag = null;
    },

    cancel(rt) {
      if (drag) rt.setLive(null);
      drag = null;
    },

    overlay(rt, ctx, view) {
      if (!drag?.rect) return;
      const r = drag.rect;
      const corner = docToScreen(view, r.x + r.w, r.y + r.h);
      drawLabel(ctx, `${Math.round(r.w)} × ${Math.round(r.h)}`, corner.x, corner.y);
    },
  };
}
