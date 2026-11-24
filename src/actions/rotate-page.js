// Rotates the active page a quarter turn (direction: 1 clockwise, -1 counter-clockwise).
import { useScannerStore } from '../store/scanner-store';

export async function rotatePage(pageCanvas, direction) {
  const page = useScannerStore.getState().activePage();
  if (!page) return;
  const pixels = await pageCanvas.pixels();
  const before = document.createElement('canvas');
  before.width = pixels.width;
  before.height = pixels.height;
  before.getContext('2d').putImageData(pixels, 0, 0);
  const canvas = pageCanvas.element;
  canvas.width = pixels.height; // resizing also clears the canvas and its transform
  canvas.height = pixels.width;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((direction * Math.PI) / 2);
  ctx.drawImage(before, -pixels.width / 2, -pixels.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  await pageCanvas.commit(page.id, page.paper);
}
