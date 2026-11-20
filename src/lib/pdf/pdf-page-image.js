// Encodes a page image as a white-backed JPEG for embedding in a PDF.
// jsPDF embeds JPEG bytes unchanged, but decodes PNG into raw uncompressed pixels
// (~4 bytes per pixel); for photo-sized pages that overflows the browser's
// maximum string length ("Invalid string length").
import { fitLongEdge } from './fit-long-edge.js';

// 200 DPI on an A4 page (11.69 in long edge): the standard document-scan resolution.
// Phone photos (~4000 px) carry more pixels than any screen or printer shows for a page;
// the extra mostly encodes sensor noise and paper grain.
export const PDF_MAX_LONG_EDGE = 2339;
// Above ~0.8, JPEG spends its extra bytes on noise, not on legibility of text.
export const PDF_JPEG_QUALITY = 0.8;

export function toPdfJpeg(source, { quality = PDF_JPEG_QUALITY, maxLongEdge = PDF_MAX_LONG_EDGE } = {}) {
  const { width, height } = fitLongEdge(source.naturalWidth || source.width, source.naturalHeight || source.height, maxLongEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // JPEG has no alpha: transparent pixels would turn black
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}
