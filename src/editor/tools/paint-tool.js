// Brush and Eraser. Dabs are stamped into a stroke buffer and merged into the
// layer when the stroke ends; only the damaged area is repainted each frame.
// Shift-click draws a straight line from the previous stroke; Alt-click picks
// a color (Brush); pen pressure scales the size.
import { brushTip } from "../engine/paint/brush-tip.js";
import { createStrokeSampler, dabSpacing } from "../engine/paint/stroke-sampler.js";
import { createStrokeBuffer } from "../engine/paint/stroke-buffer.js";
import { applyStroke } from "../engine/paint/apply-stroke.js";
import { isEmptyRect, translate } from "../engine/rect.js";
import { averageSample, rgbToHex } from "../engine/color.js";
import { selectionCanvas } from "../engine/selection/selection.js";
import { drawBrushCursor } from "../overlay/brush-cursor.js";
import { editableLayer } from "./helpers/editable-layer.js";
import { createSampleSource } from "./sample-source.js";

export function createPaintTool(id) {
  const erasing = id === "eraser";
  const sampleSource = createSampleSource();
  let buffer = null;
  let stroke = null; // { layerId, sampler, tip, pen, merge }
  let lastPoint = null; // { layerId, x, y } end of the previous stroke
  let hover = null;

  function bufferFor(layer) {
    const { width, height } = layer.canvas;
    if (!buffer || buffer.canvas.width !== width || buffer.canvas.height !== height)
      buffer = createStrokeBuffer(width, height);
    else buffer.clear();
    return buffer;
  }

  function stamp(rt, layer, dabs) {
    if (!dabs.length) return;
    const { tip, pen } = stroke;
    const damage = buffer.stamp(tip, dabs, (dab) => (pen ? Math.max(0.05, dab.pressure) : 1));
    if (!isEmptyRect(damage)) rt.invalidate(translate(damage, layer.x, layer.y));
  }

  const local = (layer, p) => ({ x: p.x - layer.x, y: p.y - layer.y, pressure: p.pressure ?? 1 });

  function pickColor(rt, e) {
    const doc = rt.session.doc;
    const x = Math.floor(e.x), y = Math.floor(e.y);
    if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return;
    const source = sampleSource(rt, true);
    const [r, g, b, a] = averageSample(source.data, doc.width, doc.height, x, y, 1);
    if (a) rt.store.getState().setColor("fg", rgbToHex([r, g, b]));
  }

  return {
    id,
    cursor: () => "none",

    down(rt, e) {
      if (!erasing && e.alt) return pickColor(rt, e);
      const layer = editableLayer(rt);
      if (!layer) return;
      const o = rt.options(id);
      const { fg, bg } = rt.store.getState().colors;
      // Erasing an alpha-locked layer paints the background color instead.
      const color = erasing ? (layer.alphaLocked ? bg : "#000000") : fg;
      const selection = rt.session.selection;
      const pen = e.pointerType === "pen";
      stroke = {
        layerId: layer.id,
        tip: brushTip(o.size, o.hardness, color),
        pen,
        sampler: createStrokeSampler({ spacing: dabSpacing(o.size, o.hardness), smoothing: o.smoothing }),
        merge: {
          buffer: bufferFor(layer),
          mode: erasing && !layer.alphaLocked ? "erase" : "paint",
          opacity: o.opacity / 100,
          alphaLocked: layer.alphaLocked,
          clip: selection ? selectionCanvas(selection) : null,
          layerX: layer.x,
          layerY: layer.y,
        },
      };
      rt.setLive({ paint: { layerId: layer.id, stroke: stroke.merge } }, { x: 0, y: 0, w: 0, h: 0 });
      if (e.shift && lastPoint?.layerId === layer.id) {
        // Straight line: no smoothing, from the end of the previous stroke.
        stroke.sampler = createStrokeSampler({ spacing: dabSpacing(o.size, o.hardness) });
        stamp(rt, layer, stroke.sampler.add(lastPoint));
      }
      stamp(rt, layer, stroke.sampler.add(local(layer, e)));
    },

    move(rt, e) {
      hover = e;
      if (!stroke) return;
      const layer = rt.session.layer(stroke.layerId);
      const dabs = [];
      for (const sample of e.samples) dabs.push(...stroke.sampler.add(local(layer, sample)));
      stamp(rt, layer, dabs);
    },

    hover(rt, e) {
      hover = e;
    },

    leave() {
      hover = null;
    },

    up(rt) {
      if (!stroke) return;
      const { session } = rt;
      const layer = session.layer(stroke.layerId);
      stamp(rt, layer, stroke.sampler.finish());
      const bounds = buffer.bounds;
      if (!isEmptyRect(bounds)) {
        const tx = session.begin(erasing ? "Eraser" : "Brush");
        tx.capture(layer, bounds);
        applyStroke(layer.canvas.getContext("2d"), bounds, stroke.merge);
        tx.damage = translate(bounds, layer.x, layer.y);
        rt.setLive(null, tx.damage);
        session.end(tx);
      } else rt.setLive(null);
      lastPoint = { layerId: layer.id, ...(stroke.sampler.target ?? {}) };
      stroke = null;
    },

    cancel(rt) {
      if (stroke) rt.setLive(null);
      stroke = null;
    },

    overlay(rt, ctx, view) {
      if (!hover) return;
      drawBrushCursor(ctx, hover.sx, hover.sy, rt.options(id).size * view.zoom);
    },
  };
}
