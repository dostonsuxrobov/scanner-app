// Advances the marching-ants phase while a selection is visible.
import { useEffect, useRef } from "react";

export function useMarchingAnts(rt, active) {
  const phase = useRef(0);
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      phase.current = (phase.current + 1) % 8;
      rt.redrawOverlay();
    }, 110);
    return () => clearInterval(timer);
  }, [rt, active]);
  return phase;
}
