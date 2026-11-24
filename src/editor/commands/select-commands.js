// Select menu.
import { growMask, shrinkMask } from "../engine/selection/grow-mask.js";
import { featherMask, fullMask, invertMask } from "../engine/selection/mask.js";
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
  // No selection means everything is editable; its inverse would select nothing.
  if (!selection) return;
  rt.session.setSelection(createSelection(invertMask(selection.mask), doc.width, doc.height), "Invert selection");
}

const CHANGES = {
  feather: ["Feather selection", featherMask],
  grow: ["Grow selection", growMask],
  shrink: ["Shrink selection", shrinkMask],
};

// how: "feather" | "grow" | "shrink", by `amount` pixels.
export function changeSelection(rt, how, amount) {
  const selection = rt.session.selection;
  if (!selection) return;
  const [label, change] = CHANGES[how];
  const { width, height } = selection;
  rt.session.setSelection(createSelection(change(selection.mask, width, height, amount), width, height), label);
  if (!rt.session.selection) rt.toast("Nothing is selected any more.");
}
