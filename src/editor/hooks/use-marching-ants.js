// Advances the marching-ants phase while a selection is visible.
import { useEffect, useRef } from "react";
import { selectionSegments } from "../engine/selection/selection.js";
import { antsAnimated } from "../overlay/marching-ants.js";

export function useMarchingAnts(rt, active) {
  const phase = useRef(0);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      const selection = rt.session.selection;
      // An outline too large to animate stays still: nothing to repaint.
      if (!selection || !antsAnimated(selectionSegments(selection))) return;
      phase.current = (phase.current + 1) % 8;
      rt.redrawOverlay();
    }, 110);
    return () => clearInterval(timer);
  }, [rt, active]);
  return phase;
}
