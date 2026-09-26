// Layer records. Pixels live in `canvas`; everything else is plain metadata.
import { cloneCanvas } from "./canvas.js";

export const BLEND_MODES = [
  ["source-over", "Normal"],
  ["multiply", "Multiply"],
  ["screen", "Screen"],
  ["overlay", "Overlay"],
  ["darken", "Darken"],
  ["lighten", "Lighten"],
  ["color-dodge", "Color dodge"],
  ["color-burn", "Color burn"],
  ["hard-light", "Hard light"],
  ["soft-light", "Soft light"],
  ["difference", "Difference"],
  ["exclusion", "Exclusion"],
  ["hue", "Hue"],
  ["saturation", "Saturation"],
  ["color", "Color"],
  ["luminosity", "Luminosity"],
];

export const isBlendMode = (value) => BLEND_MODES.some(([mode]) => mode === value);

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createLayer(name, canvas, props = {}) {
  return {
    id: newId(),
    name,
    canvas,
    x: 0,
    y: 0,
    visible: true,
    opacity: 100,
    blend: "source-over",
    locked: false,
    alphaLocked: false,
    text: null, // editable text properties while the layer is a text layer
    ...props,
  };
}

export function duplicateLayer(layer) {
  return {
    ...layer,
    id: newId(),
    name: `${layer.name} copy`,
    canvas: cloneCanvas(layer.canvas),
    text: layer.text ? { ...layer.text, style: { ...layer.text.style } } : null,
  };
}

export function copyLayerRecord(layer) {
  return { ...layer, text: layer.text ? { ...layer.text, style: { ...layer.text.style } } : null };
}

export const layerBounds = (layer) => ({
  x: layer.x,
  y: layer.y,
  w: layer.canvas.width,
  h: layer.canvas.height,
});

export const isTextLayer = (layer) => !!layer?.text;

// Positions a layer; editable text keeps its anchor in step so re-rendering
// the text later does not snap it back. The text record is replaced, not
// mutated, because undo snapshots share it.
export function moveLayerTo(layer, x, y) {
  const dx = x - layer.x;
  const dy = y - layer.y;
  layer.x = x;
  layer.y = y;
  if (layer.text && (dx || dy))
    layer.text = { ...layer.text, anchor: { x: layer.text.anchor.x + dx, y: layer.text.anchor.y + dy } };
}
