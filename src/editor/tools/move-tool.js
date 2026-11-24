// Move tool: drags the active layer, the selected pixels (lifted into their
// own layer), or only the selection outline. Shift locks to one axis.
import { layerBounds, moveLayerTo } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { union } from "../engine/rect.js";
import { nonEmpty, translateSelection } from "../engine/selection/selection.js";
import { coversLayer, liftRect, liftSelection } from "./helpers/lift-selection.js";
import { pickLayer } from "./pick-layer.js";
import { editableLayer, textConverted } from "./helpers/editable-layer.js";

function constrained(drag, e) {
  let dx = e.x - drag.start.x;
  let dy = e.y - drag.start.y;
  if (e.shift) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
  return { dx: Math.round(dx), dy: Math.round(dy) };
}

export function createMoveTool() {
  let drag = null;
  let floated = null; // id of the layer the last "Move pixels" drag lifted

  function beginLayerDrag(rt, e) {
    const { session } = rt;
    const { target, autoSelect } = rt.options("move");
    const doc = session.doc;
    // Holding Ctrl/Cmd temporarily flips "pick layer under pointer".
    if (autoSelect !== e.mod) {
      const picked = pickLayer(doc, e);
      if (!picked) return;
      if (picked.id !== doc.activeId) {
        doc.activeId = picked.id;
        session.emitChange(false);
      }
    }
    let layer = session.activeLayer;
    const selection = session.selection;
    let tx, lifted = null, converted = null;
    if (target === "pixels") {
      if (!selection?.count) return rt.toast("Select some pixels first, or set Move to “Layer”.", true);
      layer = editableLayer(rt, { alpha: true, rasterize: false });
      if (!layer) return;
      tx = session.begin("Move pixels");
      // Pixels lifted by the previous drag just keep moving; lifting them
      // again would leave an empty layer behind on every drag.
      if (layer.id !== floated || !coversLayer(layer, selection)) {
        if (doc.layers.length >= MAX_LAYERS) {
          session.cancel(tx);
          return rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
        }
        tx.capture(layer, liftRect(layer, selection));
        // Cutting pixels out of editable text makes it a pixel layer.
        if (layer.text) {
          converted = layer;
          layer.text = null;
        }
        layer = liftSelection(doc, layer, selection, { name: "Moved pixels" });
        if (!layer) {
          session.cancel(tx);
          return rt.toast("The selection does not cover any pixels of this layer.", true);
        }
        lifted = layer.id;
      }
    } else {
      const blocker = session.editBlocker(layer);
      if (blocker) return rt.toast(blocker, true);
      tx = session.begin("Move layer");
    }
    drag = { kind: "layer", tx, layerId: layer.id, start: e, origin: { x: layer.x, y: layer.y }, selection, withSelection: target === "pixels", offset: { dx: 0, dy: 0 }, lifted, converted };
    rt.invalidate(null);
  }

  return {
    id: "move",
    cursor: () => "move",

    down(rt, e) {
      const { session } = rt;
      if (rt.options("move").target === "selection") {
        if (!session.selection) return rt.toast("There is no selection to move.", true);
        const tx = session.begin("Move selection outline");
        tx.damage = false;
        drag = { kind: "outline", tx, start: e, selection: session.selection, offset: { dx: 0, dy: 0 } };
        return;
      }
      beginLayerDrag(rt, e);
    },

    move(rt, e) {
      if (!drag) return;
      drag.offset = constrained(drag, e);
      if (drag.kind === "layer") {
        const layer = rt.session.layer(drag.layerId);
        const before = layerBounds(layer);
        moveLayerTo(layer, drag.origin.x + drag.offset.dx, drag.origin.y + drag.offset.dy);
        rt.invalidate(union(before, layerBounds(layer)));
      } else rt.redrawOverlay();
    },

    up(rt) {
      if (!drag) return;
      const { tx, offset, selection } = drag;
      const moved = offset.dx || offset.dy;
      if ((drag.kind === "outline" || drag.withSelection) && selection && moved)
        rt.session.selection = nonEmpty(translateSelection(selection, offset.dx, offset.dy));
      // A click without movement changes nothing (and lifts nothing).
      if (moved) {
        rt.session.end(tx);
        if (drag.lifted) floated = drag.lifted;
        if (drag.converted) textConverted(rt, drag.converted);
      } else rt.session.cancel(tx);
      drag = null;
    },

    cancel(rt) {
      if (drag) rt.session.cancel(drag.tx);
      drag = null;
    },

    // The document is being replaced; its lifted layer is gone.
    reset() {
      floated = null;
    },

    // While dragging, the outline follows by offset; the mask moves on release.
    antsOffset() {
      return drag && (drag.kind === "outline" || drag.withSelection) ? drag.offset : null;
    },

    key(rt, event) {
      if (!event.key.startsWith("Arrow")) return false;
      const { session } = rt;
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      if (rt.options("move").target === "selection") {
        if (session.selection) session.setSelection(translateSelection(session.selection, dx, dy), "Nudge selection");
        return true;
      }
      const layer = session.activeLayer;
      const blocker = session.editBlocker(layer);
      if (blocker) {
        rt.toast(blocker, true);
        return true;
      }
      session.edit("Nudge layer", () => moveLayerTo(layer, layer.x + dx, layer.y + dy), [], { merge: `nudge:${layer.id}` });
      return true;
    },
  };
}
