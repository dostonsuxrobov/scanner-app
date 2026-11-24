import { useEffect } from 'react';
import { useScannerStore } from '../store/scanner-store';

// Zooms with the mouse wheel, keeping the point under the cursor in place.
// `key` re-attaches the listener when the viewed element is replaced.
export function useWheelZoom(containerRef, viewerRef, key) {
  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;
    if (!container || !viewer) return;

    const handleWheel = (e) => {
      if (useScannerStore.getState().activeTool === 'edit') return;
      e.preventDefault();
      const currentZoom = useScannerStore.getState().zoom;
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newZoom = Math.max(10, Math.min(400, Math.round(currentZoom * factor)));
      if (newZoom === currentZoom) return;

      const rect = viewer.getBoundingClientRect();
      const actualFactor = newZoom / currentZoom;
      const targetLeft = e.clientX - (e.clientX - rect.left) * actualFactor;
      const targetTop = e.clientY - (e.clientY - rect.top) * actualFactor;
      useScannerStore.getState().setZoom(newZoom);
      requestAnimationFrame(() => {
        const next = viewer.getBoundingClientRect();
        container.scrollLeft += next.left - targetLeft;
        container.scrollTop += next.top - targetTop;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [key]);
}
