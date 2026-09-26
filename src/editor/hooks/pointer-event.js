// Converts a DOM pointer event into the editor's tool event.
import { screenToDoc } from "../engine/view/viewport.js";

export function toolEvent(event, element, view) {
  const rect = element.getBoundingClientRect();
  const make = (e) => {
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const p = screenToDoc(view, sx, sy);
    return { x: p.x, y: p.y, sx, sy, pressure: e.pointerType === "pen" ? e.pressure : 1 };
  };
  const base = make(event);
  const coalesced = event.getCoalescedEvents?.() ?? [];
  return {
    ...base,
    samples: coalesced.length ? coalesced.map(make) : [base],
    shift: event.shiftKey,
    alt: event.altKey,
    mod: event.ctrlKey || event.metaKey,
    button: event.button,
    pointerType: event.pointerType,
  };
}
