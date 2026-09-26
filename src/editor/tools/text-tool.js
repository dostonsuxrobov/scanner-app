// Text: click to type point text, drag to make a wrapping text box, click an
// existing text layer to edit it. Typing happens on the canvas; Ctrl+Enter or
// clicking elsewhere commits, Esc cancels. Text layers stay editable until
// painted on.
import { createLayer, isTextLayer } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { dragRect } from "../engine/rect-resize.js";
import { containsPoint, union } from "../engine/rect.js";
import { ensureFont } from "../engine/text/font-loader.js";
import { renderText } from "../engine/text/text-render.js";
import { rectCorners } from "../overlay/handles.js";
import { drawDashedPolygon } from "../overlay/marching-ants.js";

const boundsOf = (layer) => ({ x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height });

function textLayerAt(doc, point) {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (layer.visible && isTextLayer(layer) && containsPoint(boundsOf(layer), point)) return layer;
  }
  return null;
}

export function createTextTool() {
  let drag = null;
  let committing = false;

  const editing = (rt) => rt.store.getState().textEdit;

  const tool = {
    id: "text",
    cursor: (rt, e) => (e && rt.session.doc && textLayerAt(rt.session.doc, e) ? "text" : "crosshair"),

    edit(rt, layer) {
      const blocker = rt.session.editBlocker(layer);
      if (blocker) return rt.toast(blocker, true);
      rt.session.doc.activeId = layer.id;
      rt.store.setState({ textEdit: { layerId: layer.id, text: structuredClone(layer.text) } });
      rt.setLive({ hide: layer.id }, boundsOf(layer));
      rt.session.emitChange(false);
    },

    down(rt, e) {
      if (editing(rt)) {
        tool.commit(rt);
        return;
      }
      const existing = textLayerAt(rt.session.doc, e);
      if (existing) return tool.edit(rt, existing);
      drag = { start: e, rect: null };
    },

    move(rt, e) {
      if (!drag) return;
      drag.rect = dragRect(drag.start, e);
      rt.redrawOverlay();
    },

    up(rt) {
      if (!drag) return;
      const { session, store } = rt;
      if (session.doc.layers.length >= MAX_LAYERS) {
        drag = null;
        return rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
      }
      const box = drag.rect && drag.rect.w > 8 ? drag.rect : null;
      const style = { ...rt.options("text") };
      store.setState({
        textEdit: {
          layerId: null,
          text: {
            content: "",
            style,
            anchor: box ? { x: box.x, y: box.y } : { x: drag.start.x, y: drag.start.y },
            boxWidth: box ? box.w : null,
          },
        },
      });
      drag = null;
      rt.redrawOverlay();
    },

    // Changes the text being typed, or the whole active text layer.
    setStyle(rt, patch) {
      const current = editing(rt);
      if (current) {
        rt.store.setState({ textEdit: { ...current, text: { ...current.text, style: { ...current.text.style, ...patch } } } });
        return;
      }
      const layer = rt.session.activeLayer;
      if (!isTextLayer(layer) || rt.session.editBlocker(layer)) return;
      const text = { ...layer.text, style: { ...layer.text.style, ...patch } };
      ensureFont(text.style).then(() => {
        if (rt.session.layer(layer.id) !== layer) return;
        const before = boundsOf(layer);
        const result = renderText(text);
        rt.session.edit("Text style", () => {
          Object.assign(layer, { canvas: result.canvas, x: result.x, y: result.y, text });
        });
        rt.invalidate(union(before, boundsOf(layer)));
      });
    },

    setContent(rt, content) {
      const current = editing(rt);
      if (current) rt.store.setState({ textEdit: { ...current, text: { ...current.text, content } } });
    },

    // Waits for the font, then commits (used when the user finishes typing).
    async commit(rt) {
      const current = editing(rt);
      if (!current || committing) return;
      committing = true;
      const ok = await ensureFont(current.text.style);
      committing = false;
      if (editing(rt) !== current) return;
      if (!ok) rt.toast(`“${current.text.style.family}” could not be loaded, so a similar font was used.`, true);
      tool.commitNow(rt);
    },

    // Commits immediately with whatever fonts are available.
    commitNow(rt) {
      const current = editing(rt);
      if (!current) return;
      rt.store.setState({ textEdit: null });
      rt.setLive(null);
      const { session } = rt;
      const { text, layerId } = current;
      const existing = layerId && session.layer(layerId);
      if (!text.content.trim()) {
        if (existing)
          session.edit("Delete text", (doc) => {
            doc.layers = doc.layers.filter((l) => l.id !== layerId);
            doc.activeId = doc.layers[doc.layers.length - 1]?.id ?? null;
          });
        return;
      }
      const result = renderText(text);
      if (existing) {
        session.edit("Edit text", () => {
          Object.assign(existing, { canvas: result.canvas, x: result.x, y: result.y, text });
        });
        return;
      }
      const layer = createLayer(text.content.split("\n")[0].slice(0, 32) || "Text", result.canvas, { x: result.x, y: result.y, text });
      session.edit("Add text", (doc) => {
        const anchor = doc.layers.findIndex((l) => l.id === doc.activeId);
        doc.layers.splice(anchor + 1, 0, layer);
        doc.activeId = layer.id;
      });
    },

    discard(rt) {
      if (!editing(rt)) return;
      rt.store.setState({ textEdit: null });
      rt.setLive(null);
    },

    deactivate(rt) {
      tool.commitNow(rt);
    },

    cancel() {
      drag = null;
    },

    overlay(rt, ctx, view, phase) {
      if (drag?.rect) drawDashedPolygon(ctx, rectCorners(drag.rect, view), phase);
    },
  };
  return tool;
}
