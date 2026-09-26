// Layer menu and Layers panel actions.
import { createCanvas } from "../engine/canvas.js";
import { createLayer, duplicateLayer, isTextLayer, moveLayerTo } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { flatten } from "../engine/flatten.js";
import { rasterizeText } from "../tools/helpers/editable-layer.js";
import { settle } from "./settle.js";

const indexOf = (doc, layer) => doc.layers.indexOf(layer);

function roomForLayer(rt) {
  if (rt.session.doc.layers.length < MAX_LAYERS) return true;
  rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
  return false;
}

export function selectLayer(rt, id) {
  const doc = rt.session.doc;
  if (!doc || doc.activeId === id || !settle(rt)) return;
  doc.activeId = id;
  rt.session.emitChange(false);
  rt.tool?.activate?.(rt);
}

export function newLayer(rt) {
  const doc = rt.session.doc;
  if (!doc || !settle(rt) || !roomForLayer(rt)) return;
  const layer = createLayer(`Layer ${doc.layers.length + 1}`, createCanvas(doc.width, doc.height));
  rt.session.edit("New layer", (d) => {
    d.layers.splice(indexOf(d, rt.session.activeLayer) + 1, 0, layer);
    d.activeId = layer.id;
  });
}

export function duplicateActiveLayer(rt) {
  const layer = rt.session.activeLayer;
  if (!layer || !settle(rt) || !roomForLayer(rt)) return;
  const copy = duplicateLayer(layer);
  rt.session.edit("Duplicate layer", (d) => {
    d.layers.splice(indexOf(d, layer) + 1, 0, copy);
    d.activeId = copy.id;
  });
}

export function deleteActiveLayer(rt) {
  const { session } = rt;
  const layer = session.activeLayer;
  if (!layer || !settle(rt)) return;
  if (layer.locked) return rt.toast(`“${layer.name}” is locked.`, true);
  if (session.doc.layers.length < 2) return rt.toast("An image needs at least one layer.", true);
  session.edit("Delete layer", (d) => {
    const i = indexOf(d, layer);
    d.layers.splice(i, 1);
    d.activeId = d.layers[Math.max(0, i - 1)].id;
  });
}

export function moveLayer(rt, direction) {
  const { session } = rt;
  const layer = session.activeLayer;
  if (!layer || !settle(rt)) return;
  const i = indexOf(session.doc, layer);
  const j = i + direction;
  if (j < 0 || j >= session.doc.layers.length) return;
  session.edit(direction > 0 ? "Raise layer" : "Lower layer", (d) => {
    [d.layers[i], d.layers[j]] = [d.layers[j], d.layers[i]];
  });
}

// Moves a layer to a new stack index (drag and drop in the Layers panel).
export function reorderLayer(rt, id, toIndex) {
  const { session } = rt;
  const doc = session.doc;
  const from = doc.layers.findIndex((l) => l.id === id);
  if (from < 0 || from === toIndex || !settle(rt)) return;
  session.edit("Reorder layers", (d) => {
    const [layer] = d.layers.splice(from, 1);
    d.layers.splice(Math.max(0, Math.min(d.layers.length, toIndex)), 0, layer);
  });
}

export function mergeDown(rt) {
  const { session } = rt;
  const doc = session.doc;
  const top = session.activeLayer;
  const i = indexOf(doc, top);
  if (!top || i < 1 || !settle(rt)) return;
  const bottom = doc.layers[i - 1];
  if (top.locked || bottom.locked) return rt.toast("Unlock both layers before merging.", true);
  // The top layer is baked onto the bottom one, which keeps its own opacity
  // and blend mode, so the image looks the same after merging.
  const base = { ...bottom, visible: true, opacity: 100, blend: "source-over" };
  const canvas = flatten({ ...doc, layers: [base, top] });
  session.edit("Merge down", (d) => {
    const merged = { ...bottom, canvas, x: 0, y: 0, text: null };
    d.layers.splice(i - 1, 2, merged);
    d.activeId = merged.id;
  });
}

export function flattenImage(rt) {
  const { session } = rt;
  if (!session.doc || !settle(rt)) return;
  const canvas = flatten(session.doc);
  session.edit("Flatten image", (d) => {
    const layer = createLayer("Background", canvas);
    d.layers = [layer];
    d.activeId = layer.id;
  });
}

export function rasterizeActiveText(rt) {
  const layer = rt.session.activeLayer;
  if (isTextLayer(layer) && settle(rt)) rasterizeText(rt, layer);
}

// Changes one property (visible, opacity, blend, locked, alphaLocked, name).
export function setLayerProperty(rt, id, key, value, label) {
  const layer = rt.session.layer(id);
  if (!layer || layer[key] === value || !settle(rt)) return;
  if (key !== "locked" && key !== "visible" && key !== "name" && layer.locked)
    return rt.toast(`“${layer.name}” is locked.`, true);
  // Repeated changes to the same property (scrubbing, typing) are one undo step.
  const merge = `${id}:${key}`;
  rt.session.edit(
    label ?? `Layer ${key}`,
    () => {
      if (key === "x") moveLayerTo(layer, value, layer.y);
      else if (key === "y") moveLayerTo(layer, layer.x, value);
      else layer[key] = value;
    },
    [],
    { merge },
  );
}

// Aligns the active layer's bounds to the canvas.
export function alignLayer(rt, how) {
  const { session } = rt;
  const layer = session.activeLayer;
  if (!layer || !settle(rt)) return;
  if (layer.locked) return rt.toast(`“${layer.name}” is locked.`, true);
  const doc = session.doc;
  const w = layer.canvas.width, h = layer.canvas.height;
  const x = { left: 0, center: Math.round((doc.width - w) / 2), right: doc.width - w }[how];
  const y = { top: 0, middle: Math.round((doc.height - h) / 2), bottom: doc.height - h }[how];
  session.edit("Align layer", () => moveLayerTo(layer, x ?? layer.x, y ?? layer.y));
}
