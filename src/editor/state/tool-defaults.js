// Initial options for every tool, as shown in the Tool Options panel.
import { DEFAULT_TEXT_STYLE } from "../engine/text/text-style.js";

export const TOOL_DEFAULTS = {
  move: { target: "layer", autoSelect: false },
  select: { mode: "replace", feather: 0, radius: 0, style: "free", ratioW: 1, ratioH: 1, fixedW: 512, fixedH: 512 },
  bycolor: { mode: "replace", threshold: 15, criterion: "rgb", sampleMerged: true, transparent: false, antialias: true, feather: 0, sampleSize: 1 },
  scale: { keepAspect: true, smoothing: true },
  brush: { size: 12, hardness: 100, opacity: 100, smoothing: 25 },
  eraser: { size: 40, hardness: 100, opacity: 100, smoothing: 25 },
  text: { ...DEFAULT_TEXT_STYLE },
  rectangle: { style: "fill", strokeWidth: 6, radius: 0, opacity: 100, newLayer: true },
  ellipse: { style: "fill", strokeWidth: 6, opacity: 100, newLayer: true },
  eyedropper: { sampleSize: 1, sampleMerged: true },
  crop: { ratio: "free", ratioW: 1, ratioH: 1, guides: "thirds", deletePixels: true },
};
