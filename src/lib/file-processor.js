import * as pdfjsLib from 'pdfjs-dist';
import { makeId, MAX_FILE_SIZE, MAX_PDF_PAGES, showToast } from './utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export async function processFiles(files, onPage, onProgress) {
  let processed = 0;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      showToast(`${file.name} exceeds 50MB limit`, true);
      continue;
    }

    if (file.type === 'application/pdf') {
      try {
        onProgress?.(`Loading ${file.name}...`);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
        if (pdf.numPages > MAX_PDF_PAGES) {
          showToast(`PDF limited to first ${MAX_PDF_PAGES} pages`);
        }

        for (let i = 1; i <= pageCount; i++) {
          onProgress?.(`Processing page ${i}/${pageCount}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
          }).promise;

          const src = canvas.toDataURL('image/png');
          onPage({
            id: makeId(),
            src,
            originalSrc: src,
            name: `${file.name}-${i}`,
            width: viewport.width,
            height: viewport.height,
            createdAt: Date.now(),
          });
          processed++;
        }
      } catch (err) {
        showToast(`Failed to load ${file.name}: ${err.message}`, true);
      }
    } else if (file.type.startsWith('image/')) {
      try {
        onProgress?.(`Loading ${file.name}...`);
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              if (img.width * img.height > 100_000_000) {
                reject(new Error('Image too large (max 100 megapixels)'));
                return;
              }
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              canvas.getContext('2d').drawImage(img, 0, 0);
              const src = canvas.toDataURL('image/png');
              onPage({
                id: makeId(),
                src,
                originalSrc: src,
                name: file.name,
                width: img.width,
                height: img.height,
                createdAt: Date.now(),
              });
              processed++;
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = ev.target.result;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      } catch (err) {
        showToast(`Failed to load ${file.name}: ${err.message}`, true);
      }
    }
  }

  return processed;
}