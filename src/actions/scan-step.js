// Scan: one incremental black-and-white contrast step on the active page.
import { useScannerStore } from '../store/scanner-store';
import { getWorker } from '../lib/image-worker-client';

export async function scanStep(pageCanvas) {
  const page = useScannerStore.getState().activePage();
  if (!page) return;
  const pixels = await pageCanvas.pixels();
  const result = await getWorker().process('scan', { imageData: pixels.data, width: pixels.width, height: pixels.height });
  pageCanvas.show(result.data, result.width, result.height);
  await pageCanvas.commit(page.id, page.paper);
}
