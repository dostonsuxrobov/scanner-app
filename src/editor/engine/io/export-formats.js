// The formats the editor can export, and which of them an encoded blob is.
export const EXPORT_FORMATS = {
  png: { label: "PNG", ext: "png", mime: "image/png", lossy: false, alpha: true },
  jpg: { label: "JPEG", ext: "jpg", mime: "image/jpeg", lossy: true, alpha: false },
  webp: { label: "WebP", ext: "webp", mime: "image/webp", lossy: true, alpha: true },
  pdf: { label: "PDF", ext: "pdf", mime: "application/pdf", lossy: true, alpha: false },
};

// A browser that cannot encode the requested type (WebP in Safari) silently
// returns PNG instead; the blob's own type says what was really written.
export function writtenFormat(blob, requested) {
  if (!blob.type || blob.type === EXPORT_FORMATS[requested].mime) return requested;
  return Object.keys(EXPORT_FORMATS).find((id) => EXPORT_FORMATS[id].mime === blob.type) ?? requested;
}
