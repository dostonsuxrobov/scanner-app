// Viewport state: zoom/pan, the viewport's size, and the pointer position.
// Kept apart from the editor store because it changes on every frame.
import { createStore } from "zustand/vanilla";

export function createViewStore() {
  return createStore(() => ({
    zoom: 1,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pointer: null, // document coordinates under the cursor
    panning: false,
  }));
}
