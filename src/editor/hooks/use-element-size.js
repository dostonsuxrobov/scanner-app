// Tracks an element's content size in CSS pixels.
import { useEffect } from "react";

export function useElementSize(ref, onSize) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      onSize(Math.round(width), Math.round(height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, onSize]);
}
