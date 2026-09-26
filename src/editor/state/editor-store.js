// UI state of the editor: active tool, tool options, colors, dialogs, and the
// transient state tools share with their option panels.
import { createStore } from "zustand/vanilla";
import { TOOL_DEFAULTS } from "./tool-defaults.js";
import { loadPreferences, savePreferences } from "./preferences.js";

export function createEditorStore() {
  return createStore((set, get) => ({
    tool: "move",
    options: structuredClone(TOOL_DEFAULTS),
    colors: { fg: "#000000", bg: "#ffffff" },
    transform: null, // pending transform draft (Transform tool)
    crop: null, // { rect } while the Crop tool is active
    textEdit: null, // { layerId, text } while typing on the canvas
    dialog: null, // { type, ...props }
    busy: null, // message while a long task runs
    panelOpen: false, // side panel on small screens
    preferences: loadPreferences(),

    setTool: (tool) => set({ tool }),
    setOption: (tool, key, value) =>
      set((s) => ({ options: { ...s.options, [tool]: { ...s.options[tool], [key]: value } } })),
    setOptions: (tool, patch) =>
      set((s) => ({ options: { ...s.options, [tool]: { ...s.options[tool], ...patch } } })),
    setColor: (which, value) => set((s) => ({ colors: { ...s.colors, [which]: value } })),
    swapColors: () => set((s) => ({ colors: { fg: s.colors.bg, bg: s.colors.fg } })),
    resetColors: () => set({ colors: { fg: "#000000", bg: "#ffffff" } }),
    openDialog: (type, props = {}) => set({ dialog: { type, ...props } }),
    closeDialog: () => set({ dialog: null }),
    setBusy: (busy) => set({ busy }),
    setPreference: (key, value) => {
      const preferences = { ...get().preferences, [key]: value };
      savePreferences(preferences);
      set({ preferences });
    },
  }));
}
