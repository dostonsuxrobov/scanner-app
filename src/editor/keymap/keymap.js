// Every keyboard shortcut. Menus read their labels from here, so shortcuts
// and menus can never disagree.
import * as file from "../commands/file-commands.js";
import * as edit from "../commands/edit-commands.js";
import * as select from "../commands/select-commands.js";
import * as image from "../commands/image-commands.js";
import * as size from "../commands/image-size-commands.js";
import * as layer from "../commands/layer-commands.js";
import * as view from "../commands/view-commands.js";
import { guardUnsaved, closeDocument } from "../commands/document-commands.js";
import { settle } from "../commands/settle.js";

const dialog = (type, props) => (rt) => rt.store.getState().openDialog(type, props);
// Dialogs that preview on the active layer need pending tool work finished.
const layerDialog = (type, props) => (rt) => settle(rt) && rt.store.getState().openDialog(type, props);
const withSelection = (run) => (rt) => !!rt.session.selection && run(rt);
const needsDoc = (run) => (rt) => rt.session.hasDocument && run(rt);

export const COMMANDS = {
  new: { keys: ["Alt+N"], run: dialog("new") },
  open: { keys: ["Mod+O"], run: (rt) => rt.openFilePicker(false) },
  openAsLayers: { keys: ["Mod+Alt+O"], run: needsDoc((rt) => rt.openFilePicker(true)) },
  save: { keys: ["Mod+S"], run: needsDoc(file.saveProject) },
  export: { keys: ["Mod+Shift+E", "Mod+Shift+S"], run: needsDoc(dialog("export")) },
  close: { keys: ["Alt+W"], run: needsDoc((rt) => guardUnsaved(rt, () => closeDocument(rt), "close")) },
  sendToScanner: { keys: [], run: needsDoc(file.sendToScanner) },
  undo: { keys: ["Mod+Z"], run: needsDoc(edit.undo) },
  redo: { keys: ["Mod+Shift+Z", "Mod+Y"], run: needsDoc(edit.redo) },
  cut: { keys: ["Mod+X"], run: needsDoc(edit.cut) },
  copy: { keys: ["Mod+C"], run: needsDoc(edit.copy) },
  paste: { keys: ["Mod+V"], run: needsDoc(edit.paste), native: true },
  clear: { keys: ["Delete", "Backspace"], run: needsDoc((rt) => edit.clearPixels(rt)) },
  fillFg: { keys: ["Alt+Backspace", "Alt+Delete"], run: needsDoc((rt) => edit.fill(rt, "fg")) },
  fillBg: { keys: ["Mod+Backspace", "Mod+Delete"], run: needsDoc((rt) => edit.fill(rt, "bg")) },
  selectAll: { keys: ["Mod+A"], run: needsDoc(select.selectAll) },
  selectNone: { keys: ["Mod+D", "Mod+Shift+A"], run: needsDoc(select.selectNone) },
  invertSelection: { keys: ["Mod+Shift+I"], run: needsDoc(select.invertSelection) },
  featherSelection: { keys: [], run: needsDoc(withSelection(dialog("selectionAmount", { action: "feather" }))) },
  growSelection: { keys: [], run: needsDoc(withSelection(dialog("selectionAmount", { action: "grow" }))) },
  shrinkSelection: { keys: [], run: needsDoc(withSelection(dialog("selectionAmount", { action: "shrink" }))) },
  cropToSelection: { keys: [], run: needsDoc(image.cropToSelection) },
  rotateCw: { keys: [], run: needsDoc((rt) => size.turnImage(rt, "cw")) },
  rotateCcw: { keys: [], run: needsDoc((rt) => size.turnImage(rt, "ccw")) },
  rotateHalf: { keys: [], run: needsDoc((rt) => size.turnImage(rt, "half")) },
  flipHorizontal: { keys: [], run: needsDoc((rt) => size.turnImage(rt, "flipH")) },
  flipVertical: { keys: [], run: needsDoc((rt) => size.turnImage(rt, "flipV")) },
  scaleImage: { keys: [], run: needsDoc(layerDialog("imageSize", { mode: "scale" })) },
  canvasSize: { keys: [], run: needsDoc(layerDialog("imageSize", { mode: "canvas" })) },
  adjustColors: { keys: ["Mod+U"], run: needsDoc(layerDialog("adjust")) },
  desaturate: { keys: ["Mod+Shift+U"], run: needsDoc(image.desaturateLayer) },
  invertColors: { keys: ["Mod+I"], run: needsDoc(image.invertLayer) },
  threshold: { keys: [], run: needsDoc(layerDialog("threshold")) },
  autoContrast: { keys: [], run: needsDoc(image.autoContrastLayer) },
  blur: { keys: [], run: needsDoc(layerDialog("blur")) },
  newLayer: { keys: ["Mod+Alt+N"], run: needsDoc(layer.newLayer) },
  duplicateLayer: { keys: ["Mod+J"], run: needsDoc(layer.duplicateActiveLayer) },
  deleteLayer: { keys: [], run: needsDoc(layer.deleteActiveLayer) },
  raiseLayer: { keys: ["Mod+]"], run: needsDoc((rt) => layer.moveLayer(rt, 1)) },
  lowerLayer: { keys: ["Mod+["], run: needsDoc((rt) => layer.moveLayer(rt, -1)) },
  mergeDown: { keys: ["Mod+E"], run: needsDoc(layer.mergeDown) },
  flatten: { keys: [], run: needsDoc(layer.flattenImage) },
  rasterizeText: { keys: [], run: needsDoc(layer.rasterizeActiveText) },
  // Not Mod+T: browsers keep that for "new tab". Shift+T is GIMP's Unified Transform.
  transform: { keys: ["Shift+T"], run: needsDoc((rt) => rt.setTool("scale")) },
  zoomIn: { keys: ["Mod+=", "Mod++", "="], run: needsDoc((rt) => view.zoomStep(rt, 1)) },
  zoomOut: { keys: ["Mod+-", "-"], run: needsDoc((rt) => view.zoomStep(rt, -1)) },
  fit: { keys: ["Mod+0", "Shift+1"], run: needsDoc(view.fitToScreen) },
  actualPixels: { keys: ["Mod+1", "1"], run: needsDoc(view.actualPixels) },
  shortcuts: { keys: ["?", "Shift+?"], run: dialog("shortcuts") },
};

// Single-key tool shortcuts (Photoshop letters, GIMP letters where they differ).
export const TOOL_KEYS = [
  ["V", "move"],
  ["M", "select"],
  ["R", "select"],
  ["Shift+S", "scale"],
  ["Shift+O", "bycolor"],
  ["B", "brush"],
  ["E", "eraser"],
  ["Shift+B", "bucket"],
  ["T", "text"],
  ["U", "rectangle"],
  ["Shift+U", "ellipse"],
  ["I", "eyedropper"],
  ["C", "crop"],
];

export const shortcutFor = (id) => COMMANDS[id]?.keys[0];
