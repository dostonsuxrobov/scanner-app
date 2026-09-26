// Routes pointer input on the viewport: navigation first (Space/middle-drag
// pans, two fingers pinch-zoom), then the active tool.
import { useEffect } from "react";
import { clampZoom, zoomAt } from "../engine/view/viewport.js";
import { setView } from "../commands/view-commands.js";
import { toolEvent } from "./pointer-event.js";

export function useCanvasInput(rt, ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const touches = new Map();
    let mode = null; // "tool" | "pan" | "pinch"
    let pan = null;
    let pinch = null;

    const updateCursor = (e) => {
      if (mode === "pan" || rt.keys.space) el.style.cursor = mode === "pan" ? "grabbing" : "grab";
      else el.style.cursor = rt.session.hasDocument ? rt.tool?.cursor?.(rt, e) ?? "default" : "default";
    };

    const setPointer = (e) => rt.view.setState({ pointer: rt.session.hasDocument ? { x: e.x, y: e.y } : null });

    function startPinch() {
      const [a, b] = [...touches.values()];
      const view = rt.view.getState();
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view };
    }

    function onDown(event) {
      if (!rt.session.hasDocument) return;
      // Focus is managed here; the browser's default would steal it back from
      // fields a tool opens during this event (e.g. text being re-edited).
      event.preventDefault();
      el.focus({ preventScroll: true });
      const rect = el.getBoundingClientRect();
      if (event.pointerType === "touch") {
        touches.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
        if (touches.size === 2) {
          // A second finger turns a stroke into a pinch: abandon the stroke.
          if (mode === "tool") rt.tool?.cancel?.(rt);
          mode = "pinch";
          startPinch();
          return;
        }
      }
      if (event.button === 1 || rt.keys.space) {
        event.preventDefault();
        mode = "pan";
        pan = { x: event.clientX, y: event.clientY, view: rt.view.getState() };
      } else if (event.button === 0) {
        mode = "tool";
        const e = toolEvent(event, el, rt.view.getState());
        rt.tool?.down?.(rt, e);
      } else return;
      el.setPointerCapture(event.pointerId);
      updateCursor();
    }

    function onMove(event) {
      const view = rt.view.getState();
      if (event.pointerType === "touch" && touches.has(event.pointerId)) {
        const rect = el.getBoundingClientRect();
        touches.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      }
      if (mode === "pinch" && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const scale = Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const zoomed = zoomAt(pinch.view, clampZoom(pinch.view.zoom * scale), pinch.mid.x, pinch.mid.y);
        setView(rt, { ...view, ...zoomed, x: zoomed.x + mid.x - pinch.mid.x, y: zoomed.y + mid.y - pinch.mid.y });
        return;
      }
      if (mode === "pan") {
        setView(rt, { ...view, x: pan.view.x + event.clientX - pan.x, y: pan.view.y + event.clientY - pan.y });
        return;
      }
      if (!rt.session.hasDocument) return;
      const e = toolEvent(event, el, view);
      setPointer(e);
      if (mode === "tool") rt.tool?.move?.(rt, e);
      else rt.tool?.hover?.(rt, e);
      updateCursor(e);
    }

    function onUp(event) {
      touches.delete(event.pointerId);
      if (mode === "pinch") {
        if (touches.size < 2) mode = touches.size ? "ignore" : null;
        return;
      }
      if (mode === "ignore") {
        if (!touches.size) mode = null;
        return;
      }
      if (mode === "tool") rt.tool?.up?.(rt, toolEvent(event, el, rt.view.getState()));
      mode = null;
      pan = null;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      updateCursor(toolEvent(event, el, rt.view.getState()));
    }

    function onLeave() {
      if (mode) return;
      rt.view.setState({ pointer: null });
      rt.tool?.leave?.(rt);
    }

    const onSpace = () => updateCursor();
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("editor-space", onSpace);
    const preventMenu = (e) => e.preventDefault();
    el.addEventListener("contextmenu", preventMenu);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("editor-space", onSpace);
      el.removeEventListener("contextmenu", preventMenu);
    };
  }, [rt, ref]);
}
