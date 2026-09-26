// React access to the editor runtime and its stores.
import { createContext, useContext, useSyncExternalStore } from "react";
import { useStore } from "zustand";

export const EditorContext = createContext(null);

export const useRuntime = () => useContext(EditorContext);

export function useEditor(selector) {
  return useStore(useRuntime().store, selector);
}

export function useView(selector) {
  return useStore(useRuntime().view, selector);
}

// Re-renders whenever the document, selection, or history changes.
export function useSessionVersion() {
  const { session } = useRuntime();
  return useSyncExternalStore(
    (listener) => session.on("change", listener),
    () => session.version,
  );
}
