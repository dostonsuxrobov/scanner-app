// Saves pages to the device as an image or a PDF.
import { showToast } from './utils';
import { toPdfJpeg } from './pdf/pdf-page-image';
import { pdfPageSize } from './pdf/pdf-page-size';
import { decodeImage } from './page-image';

// jsPDF is large and only needed once something is exported as PDF.
const loadJsPdf = async () => (await import('jspdf')).jsPDF;

// Adds `source` (a canvas or image) as a full page; returns the document.
function addPdfPage(JsPdf, doc, source, width, height, paper) {
  const size = pdfPageSize(width, height, paper);
  const format = [size.width, size.height];
  const orientation = size.width > size.height ? 'l' : 'p';
  if (doc) doc.addPage(format, orientation);
  else doc = new JsPdf({ orientation, unit: 'pt', format });
  doc.addImage(toPdfJpeg(source), 'JPEG', 0, 0, size.width, size.height);
  return doc;
}

export async function exportSinglePage(canvas, name, type, paper = null) {
  try {
    if (type === 'jpg' || type === 'png') {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type === 'jpg' ? 'image/jpeg' : 'image/png', 0.92));
      const link = document.createElement('a');
      link.download = `doc-${name}.${type}`;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      showToast(`Exported as ${type.toUpperCase()}`);
    } else {
      addPdfPage(await loadJsPdf(), null, canvas, canvas.width, canvas.height, paper).save(`doc-${name}.pdf`);
      showToast('Exported as PDF');
    }
  } catch (err) {
    showToast(`Export failed: ${err.message}`, true);
  }
}

export async function exportAllAsPdf(pages, onProgress) {
  const JsPdf = await loadJsPdf();
  let doc = null;
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`Adding page ${i + 1}/${pages.length}...`);
    const page = pages[i];
    doc = addPdfPage(JsPdf, doc, await decodeImage(page.blob), page.width, page.height, page.paper);
  }
  doc.save('document-all-pages.pdf');
  showToast(`Exported ${pages.length} page(s) as PDF`);
}
