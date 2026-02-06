import { jsPDF } from 'jspdf';
import { showToast } from './utils';

export function exportSinglePage(canvas, name, type) {
  try {
    if (type === 'jpg' || type === 'png') {
      const mime = type === 'jpg' ? 'image/jpeg' : 'image/png';
      const link = document.createElement('a');
      link.download = `doc-${name}.${type}`;
      link.href = canvas.toDataURL(mime, 1.0);
      link.click();
      showToast(`Exported as ${type.toUpperCase()}`);
    } else {
      const orient = canvas.width > canvas.height ? 'l' : 'p';
      const doc = new jsPDF({
        orientation: orient,
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      doc.save(`doc-${name}.pdf`);
      showToast('Exported as PDF');
    }
  } catch (err) {
    showToast(`Export failed: ${err.message}`, true);
  }
}

export async function exportAllAsPdf(pages, onProgress) {
  let doc = null;

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`Adding page ${i + 1}/${pages.length}...`);
    const page = pages[i];

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = page.src;
    });

    const orient = page.width > page.height ? 'l' : 'p';
    if (i === 0) {
      doc = new jsPDF({ orientation: orient, unit: 'px', format: [page.width, page.height] });
    } else {
      doc.addPage([page.width, page.height], orient);
    }
    doc.addImage(page.src, 'PNG', 0, 0, page.width, page.height);
  }

  doc.save('document-all-pages.pdf');
  showToast(`Exported ${pages.length} page(s) as PDF`);
}