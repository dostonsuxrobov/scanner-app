// Perspective crop: warps the quadrilateral the user marked onto a rectangle.
// Throws an Error with a message for the user when the selection is unusable.
import { useScannerStore } from '../store/scanner-store';
import { getWorker } from '../lib/image-worker-client';
import { isValidPolygon } from '../lib/utils';
import { cropSize } from '../lib/document/crop-size';

const MIN_SIDE = 10;
const MAX_SIDE = 10000;

export async function perspectiveCrop(pageCanvas) {
  const { cropPoints } = useScannerStore.getState();
  const page = useScannerStore.getState().activePage();
  if (!cropPoints || !page) return false;
  if (!isValidPolygon(cropPoints)) throw new Error('Invalid crop shape');
  const pixels = await pageCanvas.pixels();
  const corners = cropPoints; // kept in page pixels
  const size = cropSize(corners, pixels.width, pixels.height);
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) throw new Error('Crop area too small');
  if (size.width > MAX_SIDE || size.height > MAX_SIDE) throw new Error('Crop area too large');
  const result = await getWorker().process('transform', {
    sourceData: pixels.data,
    sourceWidth: pixels.width,
    sourceHeight: pixels.height,
    srcPoints: corners,
    outputWidth: size.width,
    outputHeight: size.height,
  });
  pageCanvas.show(result.data, result.width, result.height);
  await pageCanvas.commit(page.id);
  return true;
}
