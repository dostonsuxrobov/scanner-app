// The editable image: its size, name, and ordered layers (bottom first).
import { createCanvas } from "./canvas.js";
import { createLayer } from "./layer.js";

export function createDocument({ width, height, name = "Untitled", layers }) {
  return {
    width,
    height,
    name,
    layers,
    activeId: layers[layers.length - 1]?.id ?? null,
  };
}

export function blankDocument({ width, height, name, background }) {
  const canvas = createCanvas(width, height);
  if (background && background !== "transparent") {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  const layer = createLayer(background === "transparent" ? "Layer 1" : "Background", canvas);
  return createDocument({ width, height, name, layers: [layer] });
}

export function documentFromCanvas(canvas, name, layerName = "Background") {
  return createDocument({
    width: canvas.width,
    height: canvas.height,
    name,
    layers: [createLayer(layerName, canvas)],
  });
}

export const findLayer = (doc, id) => doc?.layers.find((l) => l.id === id) ?? null;

export const activeLayer = (doc) => findLayer(doc, doc?.activeId);
