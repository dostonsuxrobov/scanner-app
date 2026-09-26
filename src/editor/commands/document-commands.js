// Replacing, closing, and guarding the open document.
import { blankDocument, documentFromCanvas } from "../engine/document.js";
import { fitsLimits, limitsMessage } from "../engine/limits.js";
import { resetToolState } from "./reset-tool-state.js";
import { fitToScreen } from "./view-commands.js";

export function openDocument(rt, doc, selection = null) {
  resetToolState(rt);
  rt.session.open(doc);
  rt.session.selection = selection;
  rt.tool?.activate?.(rt);
  fitToScreen(rt);
}

export function newImage(rt, { width, height, background, name = "Untitled" }) {
  if (!fitsLimits(width, height)) return rt.toast(limitsMessage(), true);
  openDocument(rt, blankDocument({ width, height, name, background }));
}

export function openCanvas(rt, canvas, name, { sourceId = null, layerName } = {}) {
  const doc = documentFromCanvas(canvas, name, layerName);
  doc.sourceId = sourceId;
  openDocument(rt, doc);
}

export function closeDocument(rt) {
  resetToolState(rt);
  rt.session.close();
}

// Runs `action` right away, or after asking what to do with unsaved changes.
export function guardUnsaved(rt, action, verb = "continue") {
  if (!rt.session.isDirty) return action();
  rt.store.getState().openDialog("unsaved", { verb, onContinue: action });
}
