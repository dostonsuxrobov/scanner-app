// Small preview of a layer's pixels, redrawn when the document changes.
import { useEffect, useRef } from "react";

export function LayerThumbnail({ layer, docWidth, docHeight, version }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = window.devicePixelRatio || 1;
    const size = 34 * dpr;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    // Show the layer where it sits in the document frame.
    const scale = Math.min(size / docWidth, size / docHeight);
    const ox = (size - docWidth * scale) / 2;
    const oy = (size - docHeight * scale) / 2;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(layer.canvas, ox + layer.x * scale, oy + layer.y * scale, layer.canvas.width * scale, layer.canvas.height * scale);
  }, [layer, layer.canvas, layer.x, layer.y, docWidth, docHeight, version]);
  return <canvas ref={ref} className="ae-thumb" aria-hidden="true" />;
}
