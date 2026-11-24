// One-click fix: find the page, straighten or flatten it, and clean it up.
// Returns a message describing what was done.
import { useScannerStore } from '../store/scanner-store';
import { getWorker } from '../lib/image-worker-client';

const DOWNLOADING = 'Downloading the page-flattening AI (first time only)...';

export async function fixPage(pageCanvas) {
  const store = useScannerStore.getState();
  const page = store.activePage();
  if (!page) return null;
  const pixels = await pageCanvas.pixels();
  const result = await getWorker().process(
    'oneClickFix',
    {
      imageData: pixels.data,
      width: pixels.width,
      height: pixels.height,
      modelUrl: new URL('models/uvdoc-v1.onnx', document.baseURI).href,
    },
    ({ fraction }) => store.setProcessing(true, fraction == null ? DOWNLOADING : `${DOWNLOADING} ${Math.round(fraction * 100)}%`),
  );
  pageCanvas.show(result.data, result.width, result.height);
  const { method, paper, aiError } = result.info;
  // A page that kept its shape keeps its paper size.
  await pageCanvas.commit(page.id, method === 'none' ? page.paper : paper);
  const size = paper ? ` to ${paper}` : '';
  const message = {
    curved: `Curved page flattened${size} and cleaned up`,
    perspective: `Page straightened${size} and cleaned up`,
    none: 'Cleaned up — no page edges to straighten in this image',
  }[method];
  return { message: aiError ? `${message} (AI flattening unavailable: ${aiError})` : message, isError: !!aiError && method === 'none' };
}
