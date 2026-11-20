// Encodes a page image as a white-backed JPEG for embedding in a PDF.
// jsPDF embeds JPEG bytes unchanged, but decodes PNG into raw uncompressed pixels
// (~4 bytes per pixel); for photo-sized pages that overflows the browser's
// maximum string length ("Invalid string length").

export const PDF_JPEG_QUALITY = 0.92;

export function toPdfJpeg(source, quality = PDF_JPEG_QUALITY) {
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth || source.width;
  canvas.height = source.naturalHeight || source.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // JPEG has no alpha: transparent pixels would turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}
