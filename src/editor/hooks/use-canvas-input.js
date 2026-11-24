// Routes pointer input on the viewport: navigation first (Space/middle-drag
// pans, two fingers pinch-zoom), then the active tool. Tools draw their
// frames, handles, and readouts on the overlay from their own state, so the
// overlay is repainted after every event a tool handles (once per frame).
import { useEffect } from "react";
import { clampZoom, zoomAt } from "../engine/view/viewport.js";
import { setView } from "../commands/view-commands.js";
import { toolEvent } from "./pointer-event.js";

export function useCanvasInput(rt, ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const touches = new Map();
    let mode = null; // "tool" | "pan" | "pinch" | "ignore"
    let active = null; // id of the pointer driving the tool or pan gesture
    let pan = null;
    let pinch = null;
    let last = null; // latest tool event under the pointer

    const updateCursor = (e) => {
      if (mode === "pan" || rt.keys.space) el.style.cursor = mode === "pan" ? "grabbing" : "grab";
      else el.style.cursor = rt.session.hasDocument ? rt.tool?.cursor?.(rt, e) ?? "default" : "default";
    };

    const toTool = (method, e) => {
      rt.tool?.[method]?.(rt, e);
      rt.redrawOverlay();
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
        // A second finger turns a one-finger stroke into a pinch: abandon the
        // stroke. Fingers landing while a pen or mouse draws (a resting palm)
        // leave that stroke alone.
        if (touches.size === 2 && (!mode || mode === "ignore" || touches.has(active))) {
          if (mode === "tool") toTool("cancel");
          rt.gestureActive = false;
          mode = "pinch";
          active = null;
          startPinch();
          return;
        }
      }
      // One gesture at a time: another pointer going down must not restart it.
      if (mode) return;
      if (event.button === 1 || rt.keys.space) {
        event.preventDefault();
        mode = "pan";
        pan = { x: event.clientX, y: event.clientY, view: rt.view.getState() };
      } else if (event.button === 0) {
        mode = "tool";
        rt.gestureActive = true;
        const e = toolEvent(event, el, rt.view.getState());
        toTool("down", e);
      } else return;
      active = event.pointerId;
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
      // Only the pointer that started a gesture drives it.
      if ((mode === "pan" || mode === "tool") && event.pointerId !== active) return;
      if (mode === "pan") {
        setView(rt, { ...view, x: pan.view.x + event.clientX - pan.x, y: pan.view.y + event.clientY - pan.y });
        return;
      }
      if (!rt.session.hasDocument) return;
      const e = toolEvent(event, el, view);
      last = e;
      setPointer(e);
      toTool(mode === "tool" ? "move" : "hover", e);
      updateCursor(e);
    }

    // `cancelled`: the browser took the pointer away (palm rejection, a system
    // gesture), so the stroke is abandoned rather than committed.
    function finish(event, cancelled) {
      touches.delete(event.pointerId);
      if (mode === "pinch") {
        if (touches.size < 2) mode = touches.size ? "ignore" : null;
        return;
      }
      if (mode === "ignore") {
        if (!touches.size) mode = null;
        return;
      }
      if (mode && event.pointerId !== active) return;
      if (mode === "tool") {
        if (cancelled) toTool("cancel");
        else toTool("up", toolEvent(event, el, rt.view.getState()));
      }
      rt.gestureActive = false;
      mode = null;
      active = null;
      pan = null;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      updateCursor(toolEvent(event, el, rt.view.getState()));
    }

    const onUp = (event) => finish(event, false);
    const onCancel = (event) => finish(event, true);

    function onLeave() {
      if (mode) return;
      last = null;
      rt.view.setState({ pointer: null });
      toTool("leave");
    }

    const onSpace = () => updateCursor();
    // Pressing or releasing Shift/Ctrl/Alt changes the selection mode badge
    // right away, without waiting for the mouse to move.
    const onModifier = (event) => {
      if (!last || mode === "pan" || !["Shift", "Control", "Meta", "Alt"].includes(event.key)) return;
      updateCursor({ ...last, shift: event.shiftKey, alt: event.altKey, mod: event.ctrlKey || event.metaKey });
    };
    window.addEventListener("keydown", onModifier);
    window.addEventListener("keyup", onModifier);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("editor-space", onSpace);
    const preventMenu = (e) => e.preventDefault();
    el.addEventListener("contextmenu", preventMenu);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("editor-space", onSpace);
      window.removeEventListener("keydown", onModifier);
      window.removeEventListener("keyup", onModifier);
      el.removeEventListener("contextmenu", preventMenu);
    };
  }, [rt, ref]);
}
