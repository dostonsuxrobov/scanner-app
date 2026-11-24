// Undo steps of a page: earlier pictures ({ blob, width, height, paper }),
// oldest first. The list is bounded by count and by the bytes its Blobs hold;
// the oldest steps go first.
export const MAX_STEPS = 30;
export const MAX_BYTES = 256 * 1024 * 1024;

export function pushStep(steps, image, { maxSteps = MAX_STEPS, maxBytes = MAX_BYTES } = {}) {
  const next = [...steps, image];
  let bytes = next.reduce((sum, step) => sum + step.blob.size, 0);
  while (next.length > 1 && (next.length > maxSteps || bytes > maxBytes)) bytes -= next.shift().blob.size;
  return next;
}
