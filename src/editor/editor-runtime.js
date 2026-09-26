// Wires the session, stores, compositor, and renderer together. Tools and
// commands receive this object and never touch React.
import { EditorSession } from "./engine/session.js";
import { createCompositor } from "./engine/compositor.js";
import { createEditorStore } from "./state/editor-store.js";
import { createViewStore } from "./state/view-store.js";
import { selectionCanvas } from "./engine/selection/selection.js";
import { createRenderScheduler } from "./render-scheduler.js";
import { showToast } from "../lib/utils";

export function createEditorRuntime() {
  const session = new EditorSession();
  const store = createEditorStore();
  const view = createViewStore();
  const compositor = createCompositor();
  const scheduler = createRenderScheduler();
  let live = {};

  const runtime = {
    session,
    store,
    view,
    compositor,
    scheduler,
    tools: {},
    keys: { space: false },

    get live() {
      return live;
    },
    // Replaces the live preview (stroke, transform, filter…) for one layer.
    setLive(next, damage = null) {
      live = next || {};
      runtime.invalidate(damage);
    },
    invalidate(rect = null) {
      compositor.invalidate(rect);
      scheduler.request("document");
    },
    redrawOverlay() {
      scheduler.request("overlay");
    },
    get tool() {
      return runtime.tools[store.getState().tool];
    },
    // Switching tools lets the old one finish (apply a transform, commit text).
    setTool(id) {
      const current = store.getState().tool;
      if (current === id || !runtime.tools[id]) return;
      if (session.hasDocument) runtime.tools[current]?.deactivate?.(runtime);
      store.getState().setTool(id);
      if (session.hasDocument) runtime.tools[id].activate?.(runtime);
      scheduler.request("overlay");
    },
    // Set by the UI, which owns the hidden file input.
    filePicker: null,
    openFilePicker(asLayers = false) {
      runtime.filePicker?.(asLayers);
    },
    options(toolId = store.getState().tool) {
      return store.getState().options[toolId];
    },
    toast(message, isError = false) {
      showToast(message, isError);
    },
    // Runs an async task with a busy indicator and error reporting.
    async task(message, work) {
      store.getState().setBusy(message);
      try {
        return await work();
      } catch (error) {
        showToast(error.message || String(error), true);
        return undefined;
      } finally {
        store.getState().setBusy(null);
      }
    },
  };

  session.on("pixels", (rect) => runtime.invalidate(rect));
  // Structure and selection changes can move outlines and handles.
  session.on("change", () => scheduler.request("overlay"));
  // Prepare the selection's clip mask while idle, so the next brush stroke or
  // fill starts instantly.
  const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 50));
  session.on("change", () => {
    const selection = session.selection;
    if (selection && !selection.cache.canvas) idle(() => session.selection === selection && selectionCanvas(selection));
  });
  // Pan and zoom repaint everything.
  view.subscribe((next, prev) => {
    if (next.zoom !== prev.zoom || next.x !== prev.x || next.y !== prev.y || next.width !== prev.width || next.height !== prev.height)
      scheduler.request("document", "overlay");
  });
  return runtime;
}
