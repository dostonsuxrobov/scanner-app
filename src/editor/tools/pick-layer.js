// Topmost visible layer with a non-transparent pixel at a document point.
export function pickLayer(doc, point) {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (!layer.visible || layer.opacity <= 0) continue;
    const x = Math.floor(point.x - layer.x);
    const y = Math.floor(point.y - layer.y);
    if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) continue;
    if (layer.canvas.getContext("2d").getImageData(x, y, 1, 1).data[3] > 0) return layer;
  }
  return null;
}
