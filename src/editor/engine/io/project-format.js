// Editable project files (.json): layers as PNG data URLs plus metadata.
// Version 3 adds text layers; versions 1–2 from the previous editor still open.
import { MAX_LAYERS, fitsLimits } from "../limits.js";
import { isBlendMode } from "../layer.js";

export const PROJECT_TYPE = "simple-editor-project";
export const PROJECT_VERSION = 3;

const isPng = (src) => typeof src === "string" && /^data:image\/png;base64,/.test(src);

// Throws a readable error when the parsed JSON is not a usable project.
export function validateProject(data) {
  const d = data?.document;
  if (data?.type !== PROJECT_TYPE || ![1, 2, 3].includes(data.version) || !d)
    throw new Error("This file is not an editor project.");
  if (!fitsLimits(d.width, d.height)) throw new Error("The project's canvas size is not supported.");
  if (!Array.isArray(d.layers) || d.layers.length < 1 || d.layers.length > MAX_LAYERS)
    throw new Error("The project has no usable layers.");
  for (const l of d.layers) {
    const valid =
      isPng(l.src) &&
      typeof l.name === "string" &&
      Number.isFinite(l.x) &&
      Number.isFinite(l.y) &&
      Number.isFinite(l.opacity) &&
      l.opacity >= 0 &&
      l.opacity <= 100 &&
      isBlendMode(l.blend) &&
      (l.text == null || (typeof l.text.content === "string" && typeof l.text.style === "object"));
    if (!valid) throw new Error(`Layer “${String(l.name).slice(0, 40)}” is damaged.`);
  }
  const ids = new Set(d.layers.map((l) => l.id));
  if (ids.size !== d.layers.length) throw new Error("The project has duplicate layers.");
  if (d.selection && !isPng(d.selection.src)) throw new Error("The project's selection is damaged.");
  return d;
}

export function projectFileName(name) {
  return `${name || "Untitled"}.project.json`;
}
