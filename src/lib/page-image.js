// A page's picture as stored and passed around: { blob, width, height, paper }.
// Blobs are compressed and live outside the JS heap, unlike data-URL strings.

// Encodes a canvas as a PNG Blob. The pixels are captured when this is
// called; encoding happens off the main thread.
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded'))), 'image/png'),
  );
}

// Decodes a Blob into an <img> (which, unlike createImageBitmap in older
// browsers, always honours the photo's EXIF orientation).
export async function decodeImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new Error('The image could not be read');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The picture part of a page (what undo steps and "original" hold).
export const pageImage = ({ blob, width, height, paper = null }) => ({ blob, width, height, paper });
