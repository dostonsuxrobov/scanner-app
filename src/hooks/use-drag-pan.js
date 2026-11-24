import { useRef, useCallback } from 'react';

// Pans a scrollable container by dragging with the right mouse button.
// `enabled()` says whether panning applies right now. Returns handlers for
// the container. (Touch pans by the container's own scrolling.)
export function useDragPan(containerRef, enabled) {
  const drag = useRef(null);

  const onPointerDown = useCallback((e) => {
    const container = containerRef.current;
    if (e.button !== 2 || e.pointerType !== 'mouse' || !container || !enabled()) return;
    e.preventDefault();
    container.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: container.scrollLeft, top: container.scrollTop };
    container.style.cursor = 'grabbing';
  }, [containerRef, enabled]);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    containerRef.current.scrollLeft = d.left - (e.clientX - d.x);
    containerRef.current.scrollTop = d.top - (e.clientY - d.y);
  }, [containerRef]);

  const stop = useCallback((e) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    containerRef.current.style.cursor = '';
  }, [containerRef]);

  const onContextMenu = useCallback((e) => {
    if (enabled()) e.preventDefault();
  }, [enabled]);

  return { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop, onContextMenu };
}
