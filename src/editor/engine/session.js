// EditorSession owns the open document, its selection, and its undo history.
// It is framework-free: the UI subscribes to `change` (structure changed) and
// `pixels` (only pixels changed, so only the canvas needs repainting).
import { createHistory } from "./history.js";
import { capturePatch, swapPatch, patchBytes } from "./pixel-patch.js";
import { copyLayerRecord } from "./layer.js";
import { activeLayer, findLayer } from "./document.js";
import { selectionBytes } from "./selection/selection.js";

function captureState(session) {
  const doc = session.doc;
  return {
    doc: doc && { ...doc, layers: doc.layers.map(copyLayerRecord) },
    selection: session.selection,
  };
}

// Canvases that only the stored state references are what the entry keeps alive.
function stateBytes(stored, current) {
  const live = new Set(current.doc?.layers.map((l) => l.canvas));
  let total = selectionBytes(stored.selection);
  for (const layer of stored.doc?.layers || [])
    if (!live.has(layer.canvas)) total += layer.canvas.width * layer.canvas.height * 4;
  return total;
}

export class EditorSession {
  constructor() {
    this.doc = null;
    this.selection = null;
    this.history = createHistory();
    this.savedRevision = 0;
    this.version = 0;
    this.pixelVersion = 0; // changes only when pixels may have changed
    this.clipboard = null;
    this.listeners = { change: new Set(), pixels: new Set() };
    this.pending = null;
  }

  // --- subscriptions -------------------------------------------------------
  on(kind, listener) {
    this.listeners[kind].add(listener);
    return () => this.listeners[kind].delete(listener);
  }
  // `damage`: document rect whose pixels changed, null for everything, or
  // false when only non-pixel state (e.g. the selection) changed.
  emitChange(damage = null) {
    this.version++;
    this.listeners.change.forEach((l) => l());
    if (damage !== false) this.emitPixels(damage);
  }
  // `rect` is the damaged document area, or null for everything.
  emitPixels(rect) {
    this.pixelVersion++;
    this.listeners.pixels.forEach((l) => l(rect));
  }

  // --- document lifecycle --------------------------------------------------
  open(doc) {
    this.doc = doc;
    this.selection = null;
    this.history.clear();
    this.savedRevision = 0;
    this.emitChange();
  }
  close() {
    this.open(null);
  }
  get hasDocument() {
    return !!this.doc;
  }
  get revision() {
    return this.history.currentId;
  }
  get isDirty() {
    return !!this.doc && this.revision !== this.savedRevision;
  }
  markSaved() {
    this.savedRevision = this.revision;
    this.emitChange();
  }
  get activeLayer() {
    return activeLayer(this.doc);
  }
  layer(id) {
    return findLayer(this.doc, id);
  }

  // --- transactions --------------------------------------------------------
  // Start recording an edit. Capture pixel regions before changing them.
  begin(label) {
    if (this.pending) this.end(this.pending);
    // Set `tx.damage` to a document rect (or false) to limit repainting.
    const tx = { label, before: captureState(this), patches: [], damage: null };
    tx.capture = (layer, rect) => {
      const patch = capturePatch(layer, rect);
      if (patch) tx.patches.push(patch);
    };
    this.pending = tx;
    return tx;
  }
  end(tx) {
    if (this.pending === tx) this.pending = null;
    const now = captureState(this);
    const bytes = stateBytes(tx.before, now) + tx.patches.reduce((n, p) => n + patchBytes(p), 0);
    this.history.push({ label: tx.label, state: tx.before, patches: tx.patches, bytes });
    this.emitChange(tx.damage);
  }
  // Abandon an edit, restoring pixels and structure as they were.
  cancel(tx) {
    if (this.pending === tx) this.pending = null;
    this.applyEntry({ state: tx.before, patches: tx.patches });
    this.emitChange();
  }
  // Convenience wrapper for a synchronous edit.
  edit(label, mutate, regions = []) {
    const tx = this.begin(label);
    for (const [layer, rect] of regions) tx.capture(layer, rect);
    try {
      mutate(this.doc);
    } catch (error) {
      this.cancel(tx);
      throw error;
    }
    this.end(tx);
  }

  applyEntry(entry) {
    for (const patch of [...entry.patches].reverse()) {
      const layer = this.layer(patch.layerId);
      if (layer) swapPatch(patch, layer);
    }
    const current = captureState(this);
    this.doc = entry.state.doc && {
      ...entry.state.doc,
      layers: entry.state.doc.layers.map(copyLayerRecord),
    };
    this.selection = entry.state.selection;
    entry.state = current;
    return entry;
  }

  undo() {
    if (this.pending) this.end(this.pending);
    if (!this.history.undo((e) => this.applyEntry(e))) return false;
    this.emitChange();
    return true;
  }
  redo() {
    if (!this.history.redo((e) => this.applyEntry(e))) return false;
    this.emitChange();
    return true;
  }

  // --- selection -----------------------------------------------------------
  setSelection(selection, label = "Selection") {
    const tx = this.begin(label);
    tx.damage = false;
    this.selection = selection;
    this.end(tx);
  }
  // Preview a selection without recording history (e.g. while dragging).
  previewSelection(selection) {
    this.selection = selection;
    this.emitChange(false);
  }

  // --- guards --------------------------------------------------------------
  // Returns an error message when the layer cannot receive the edit.
  editBlocker(layer, { alpha = false } = {}) {
    if (!layer) return "Select a layer first.";
    if (!layer.visible) return `“${layer.name}” is hidden. Show it before editing.`;
    if (layer.locked) return `“${layer.name}” is locked. Unlock it in the Layers panel.`;
    if (alpha && layer.alphaLocked) return `Transparency of “${layer.name}” is locked.`;
    return null;
  }
}
