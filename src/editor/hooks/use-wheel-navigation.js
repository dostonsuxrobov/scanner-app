// Mouse wheel and trackpad navigation. By default the wheel zooms around the
// pointer (Shift+wheel pans sideways, Alt+wheel pans up/down); the View menu
// can switch to "wheel scrolls" where Ctrl+wheel zooms. Trackpad pinch
// (reported as Ctrl+wheel) always zooms.
import { useEffect } from "react";
import { wheelZoomFactor, zoomAt } from "../engine/view/viewport.js";
import { setView } from "../commands/view-commands.js";

export function useWheelNavigation(rt, ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    function onWheel(event) {
      if (!rt.session.hasDocument) return;
      event.preventDefault();
      const view = rt.view.getState();
      const rect = el.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const wheelZooms = rt.store.getState().preferences.wheelZooms;
      const zoom = event.ctrlKey || event.metaKey || (wheelZooms && !event.shiftKey && !event.altKey);
      if (zoom) {
        const factor = wheelZoomFactor(event.deltaY, event.deltaMode);
        setView(rt, { ...view, ...zoomAt(view, view.zoom * factor, sx, sy) });
        return;
      }
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      let dx = event.deltaX * unit;
      let dy = event.deltaY * unit;
      if (event.shiftKey && !dx) [dx, dy] = [dy, 0];
      setView(rt, { ...view, x: view.x - dx, y: view.y - dy });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [rt, ref]);
}
