// Select menu.
import { fullMask, invertMask } from "../engine/selection/mask.js";
import { createSelection } from "../engine/selection/selection.js";
import { settle } from "./settle.js";

export function selectAll(rt) {
  const doc = rt.session.doc;
  if (!doc || !settle(rt)) return;
  const rect = { x: 0, y: 0, w: doc.width, h: doc.height };
  rt.session.setSelection(createSelection(fullMask(doc.width, doc.height), doc.width, doc.height, { type: "rect", rect, radius: 0, feather: 0 }), "Select all");
}

export function selectNone(rt) {
  if (rt.session.selection) rt.session.setSelection(null, "Deselect");
}

export function invertSelection(rt) {
  const doc = rt.session.doc;
  if (!doc) return;
  const selection = rt.session.selection;
  const mask = selection ? invertMask(selection.mask) : new Uint8ClampedArray(doc.width * doc.height);
  rt.session.setSelection(createSelection(mask, doc.width, doc.height), "Invert selection");
}
