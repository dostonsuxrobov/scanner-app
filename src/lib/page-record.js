// Converts pages to and from the records kept in IndexedDB. Records hold
// Blobs. Records written by earlier versions held PNG data-URL strings
// (`src`, `originalSrc`); those are converted when read.
const fromDataUrl = async (url) => (await fetch(url)).blob();

export function toRecord(page, order) {
  return { ...page, order };
}

export async function fromRecord(record) {
  const { order, src, originalSrc, originalWidth, originalHeight, ...page } = record;
  if (page.blob) return page;
  const blob = await fromDataUrl(src);
  const original = originalSrc && originalSrc !== src
    ? { blob: await fromDataUrl(originalSrc), width: originalWidth, height: originalHeight, paper: null }
    : { blob, width: originalWidth ?? page.width, height: originalHeight ?? page.height, paper: null };
  return { ...page, blob, paper: null, original };
}
