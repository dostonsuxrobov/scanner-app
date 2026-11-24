// Turns uploaded files into pages: an image file becomes one page that keeps
// the file itself as its picture; a PDF becomes one page per PDF page.
import { makeId, MAX_FILE_SIZE, MAX_PDF_PAGES, showToast } from './utils';
import { canvasToBlob, decodeImage } from './page-image';

const MAX_IMAGE_PIXELS = 100_000_000;
const PDF_SCALE = 2.0; // 144 dpi

function newPage(name, blob, width, height) {
  const image = { blob, width, height, paper: null };
  return { id: makeId(), name, createdAt: Date.now(), ...image, original: image };
}

// pdf.js is large and only needed once a PDF is opened.
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  return pdfjs;
}

async function addPdf(file, onPage, onProgress) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    if (pdf.numPages > MAX_PDF_PAGES) showToast(`PDF limited to first ${MAX_PDF_PAGES} pages`);
    for (let i = 1; i <= pageCount; i++) {
      onProgress?.(`Processing page ${i}/${pageCount}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: PDF_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      onPage(newPage(`${file.name}-${i}`, await canvasToBlob(canvas), canvas.width, canvas.height));
    }
    return pageCount;
  } finally {
    pdf.destroy();
  }
}

async function addImage(file, onPage) {
  const image = await decodeImage(file);
  const { naturalWidth: width, naturalHeight: height } = image;
  if (width * height > MAX_IMAGE_PIXELS) throw new Error('Image too large (max 100 megapixels)');
  onPage(newPage(file.name, file, width, height));
  return 1;
}

// Calls onPage for every page found; returns how many were added.
export async function processFiles(files, onPage, onProgress) {
  let processed = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      showToast(`${file.name} exceeds 50MB limit`, true);
      continue;
    }
    try {
      onProgress?.(`Loading ${file.name}...`);
      if (file.type === 'application/pdf') processed += await addPdf(file, onPage, onProgress);
      else if (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)) processed += await addImage(file, onPage);
      else showToast(`${file.name} is not an image or a PDF`, true);
    } catch (err) {
      const heic = /hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      showToast(heic ? `${file.name}: this browser cannot open HEIC photos — convert it to JPEG first` : `Failed to load ${file.name}: ${err.message}`, true);
    }
  }
  return processed;
}
