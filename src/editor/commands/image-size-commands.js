// Image menu: changes to the geometry of the whole image — quarter turns,
// flips, scaling, and canvas size. Each is one undo step.
import { canvasSizeRect, cropDocument } from "../engine/crop-document.js";
import { scaleDocument } from "../engine/scale-document.js";
import { createSelection } from "../engine/selection/selection.js";
import { turnDocument, turnMask } from "../engine/transform/turn-image.js";
import { fitToScreen } from "./view-commands.js";
import { settle } from "./settle.js";

const TURN_LABELS = { cw: "Rotate 90° clockwise", ccw: "Rotate 90° counter-clockwise", half: "Rotate 180°", flipH: "Flip horizontally", flipV: "Flip vertically" };

// Runs `change(doc)` as one undo step, with the checks every whole-image
// change shares. Returns whether it was applied.
function reshape(rt, label, change) {
  const { session } = rt;
  if (!settle(rt)) return false;
  const locked = session.doc.layers.find((l) => l.locked);
  if (locked) {
    rt.toast(`Unlock “${locked.name}” first: this changes every layer.`, true);
    return false;
  }
  const texts = (doc) => doc.layers.filter((l) => l.text).length;
  const before = { width: session.doc.width, height: session.doc.height, texts: texts(session.doc) };
  try {
    session.edit(label, change);
  } catch (error) {
    rt.toast(error.message, true); // e.g. the new size is past the limit
    return false;
  }
  if (texts(session.doc) < before.texts) rt.toast("Text layers are now pixel layers; their text is no longer editable.");
  if (session.doc.width !== before.width || session.doc.height !== before.height) {
    // The Crop tool's frame was drawn for the old size.
    if (rt.store.getState().crop) rt.tools.crop.reset(rt);
    fitToScreen(rt);
  }
  return true;
}

// how: "cw" | "ccw" | "half" | "flipH" | "flipV". The selection turns too.
export function turnImage(rt, how) {
  const { session } = rt;
  reshape(rt, TURN_LABELS[how], (doc) => {
    const s = session.selection;
    turnDocument(doc, how);
    session.selection = s && createSelection(turnMask(s.mask, s.width, s.height, how), doc.width, doc.height);
  });
}

export function scaleImage(rt, width, height) {
  const { session } = rt;
  if (width === session.doc.width && height === session.doc.height) return true;
  return reshape(rt, "Scale image", (doc) => {
    scaleDocument(doc, width, height);
    session.selection = null;
  });
}

// Adds or trims space around the image; layers keep all their pixels.
export function resizeCanvas(rt, width, height, anchor) {
  const { session } = rt;
  if (width === session.doc.width && height === session.doc.height) return true;
  return reshape(rt, "Canvas size", (doc) => {
    cropDocument(doc, canvasSizeRect(doc, width, height, anchor), { deletePixels: false });
    session.selection = null;
  });
}
