// Explains a stroke or shape that missed the active layer entirely. Painting
// does not enlarge layers, so without this the tool would just seem broken.
export function warnOutsideLayer(rt, layer) {
  const doc = rt.session.doc;
  const coversImage = layer.x <= 0 && layer.y <= 0 && layer.x + layer.canvas.width >= doc.width && layer.y + layer.canvas.height >= doc.height;
  // On a full-size layer the miss was outside the image itself: self-evident.
  if (coversImage) return;
  rt.toast(`Nothing was drawn: “${layer.name}” is smaller than the image. Draw inside its dashed outline, or choose or add another layer.`, true);
}
