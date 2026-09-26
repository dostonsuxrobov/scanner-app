// Edit menu: undo/redo, clipboard, clearing and filling pixels.
import { createCanvas } from "../engine/canvas.js";
import { createLayer, layerBounds } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { intersect, isEmptyRect } from "../engine/rect.js";
import { selectionCanvas } from "../engine/selection/selection.js";
import { decodeImageFile } from "../engine/io/image-file.js";
import { editableLayer } from "../tools/helpers/editable-layer.js";
import { addLayerFromCanvas } from "./file-commands.js";
import { settle } from "./settle.js";

export function undo(rt) {
  if (rt.store.getState().textEdit) return rt.tools.text.discard(rt);
  if (rt.tools.scale.interceptUndo(rt)) return;
  rt.session.undo();
}

export function redo(rt) {
  if (!settle(rt)) return;
  rt.session.redo();
}

// Region of the layer (layer coordinates) affected by the selection, or all of it.
function affectedRect(layer, selection) {
  if (!selection) return { x: 0, y: 0, w: layer.canvas.width, h: layer.canvas.height };
  const r = intersect(selection.bounds, layerBounds(layer));
  return { x: r.x - layer.x, y: r.y - layer.y, w: r.w, h: r.h };
}

// The selected pixels of the active layer (or the whole layer) as a canvas.
function selectedPixels(rt) {
  const layer = rt.session.activeLayer;
  const selection = rt.session.selection;
  if (!layer) return null;
  if (selection && !selection.count) return null;
  const doc = rt.session.doc;
  const area = selection
    ? intersect(selection.bounds, layerBounds(layer))
    : intersect({ x: 0, y: 0, w: doc.width, h: doc.height }, layerBounds(layer));
  if (isEmptyRect(area)) return null;
  const canvas = createCanvas(area.w, area.h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(layer.canvas, layer.x - area.x, layer.y - area.y);
  if (selection) {
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(selectionCanvas(selection), -area.x, -area.y);
  }
  return { canvas, x: area.x, y: area.y };
}

export function copy(rt) {
  if (!settle(rt)) return false;
  const piece = selectedPixels(rt);
  if (!piece) {
    rt.toast("Nothing to copy: the selection is empty here.", true);
    return false;
  }
  rt.session.clipboard = piece;
  // Also place it on the system clipboard so other apps can paste it.
  piece.canvas.toBlob((blob) => {
    try {
      if (blob && navigator.clipboard?.write && window.ClipboardItem)
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).catch(() => {});
    } catch {
      // The system clipboard is optional; the editor's own clipboard still works.
    }
  });
  rt.toast("Copied. Paste adds it as a new layer.");
  return true;
}

export function cut(rt) {
  if (copy(rt)) clearPixels(rt, "Cut");
}

export function paste(rt) {
  const piece = rt.session.clipboard;
  if (!piece || !settle(rt)) return rt.toast("The clipboard is empty.", true);
  const { session } = rt;
  if (session.doc.layers.length >= MAX_LAYERS) return rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
  const canvas = createCanvas(piece.canvas.width, piece.canvas.height);
  canvas.getContext("2d").drawImage(piece.canvas, 0, 0);
  const layer = createLayer("Pasted layer", canvas, { x: piece.x, y: piece.y });
  session.edit("Paste", (doc) => {
    const at = doc.layers.findIndex((l) => l.id === doc.activeId);
    doc.layers.splice(at + 1, 0, layer);
    doc.activeId = layer.id;
    session.selection = null;
  });
}

// Pastes an image from the system clipboard (e.g. a screenshot).
export async function pasteImageFile(rt, file) {
  if (!rt.session.hasDocument || !settle(rt)) return;
  const decoded = await rt.task("Pasting…", () => decodeImageFile(file));
  if (decoded) addLayerFromCanvas(rt, decoded.canvas, "Pasted image");
}

export function clearPixels(rt, label = "Clear") {
  if (!settle(rt)) return;
  const layer = editableLayer(rt, { alpha: true });
  if (!layer) return;
  const selection = rt.session.selection;
  if (selection && !selection.count) return;
  const rect = affectedRect(layer, selection);
  rt.session.edit(
    label,
    () => {
      const ctx = layer.canvas.getContext("2d");
      if (!selection) return ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(selectionCanvas(selection), -layer.x, -layer.y);
      ctx.restore();
    },
    [[layer, rect]],
  );
}

export function fill(rt, which = "fg") {
  if (!settle(rt)) return;
  const layer = editableLayer(rt);
  if (!layer) return;
  const selection = rt.session.selection;
  if (selection && !selection.count) return;
  const color = rt.store.getState().colors[which];
  const rect = affectedRect(layer, selection);
  rt.session.edit(
    which === "fg" ? "Fill with foreground" : "Fill with background",
    () => {
      const { width, height } = layer.canvas;
      const paint = createCanvas(width, height);
      const pctx = paint.getContext("2d");
      pctx.fillStyle = color;
      pctx.fillRect(0, 0, width, height);
      if (selection) {
        pctx.globalCompositeOperation = "destination-in";
        pctx.drawImage(selectionCanvas(selection), -layer.x, -layer.y);
      }
      const ctx = layer.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = layer.alphaLocked ? "source-atop" : "source-over";
      ctx.drawImage(paint, 0, 0);
      ctx.restore();
    },
    [[layer, rect]],
  );
}
