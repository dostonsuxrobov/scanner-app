// The canvas that shows the active page, as the working copy of its picture.
//
// Edits happen on the canvas (painting directly, tools by replacing its
// pixels). `commit` then stores what the canvas shows as the page's new
// picture; the encoding runs in the background, so nothing waits for it.
// When the page's picture changes for another reason (another page chosen,
// undo, reset), `draw` brings the canvas up to date.
import { useScannerStore } from '../store/scanner-store';
import { canvasToBlob, decodeImage } from './page-image';

export function createPageCanvas(canvasRef) {
  let shown = null; // the Blob whose picture the canvas holds
  let drawing = Promise.resolve(); // settles when the canvas is up to date
  let commits = Promise.resolve(); // commits land in the order they were made
  let latestDraw = 0;

  return {
    get element() {
      return canvasRef.current;
    },

    // Shows a page's stored picture, unless the canvas already holds it.
    draw(page) {
      const canvas = canvasRef.current;
      if (!canvas || !page || page.blob === shown) return drawing;
      const turn = ++latestDraw;
      canvas.dataset.ready = 'false';
      drawing = decodeImage(page.blob).then((image) => {
        if (turn !== latestDraw) return; // a newer draw took over
        canvas.width = page.width;
        canvas.height = page.height;
        canvas.getContext('2d').drawImage(image, 0, 0, page.width, page.height);
        shown = page.blob;
        canvas.dataset.ready = 'true';
      });
      drawing.catch(() => {
        if (turn === latestDraw) canvas.dataset.ready = 'error';
      });
      return drawing;
    },

    // The canvas pixels, once the canvas is up to date. Rejects if the page's
    // picture could not be shown.
    async pixels() {
      await drawing;
      const canvas = canvasRef.current;
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    },

    // Replaces the canvas content with RGBA pixels of a (possibly new) size.
    show(data, width, height) {
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
    },

    // Stores what the canvas shows now as the picture of page `id`.
    // `paper` is the page's paper size name, when known.
    commit(id, paper = null) {
      const canvas = canvasRef.current;
      const { width, height } = canvas;
      const encoded = canvasToBlob(canvas);
      commits = commits
        .then(() => encoded)
        .then((blob) => {
          if (useScannerStore.getState().activePageId === id) shown = blob;
          useScannerStore.getState().commitImage(id, { blob, width, height, paper });
        });
      return commits;
    },

    // Settles when every commit made so far has landed.
    settled() {
      return commits.catch(() => {});
    },
  };
}
