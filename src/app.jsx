import { useRef, useEffect, useCallback } from 'react';
import { useScannerStore } from './store/scanner-store';
import { showToast, isValidPolygon } from './lib/utils';
import { getWorker, terminateWorker } from './lib/image-worker-client';
import { processFiles } from './lib/file-processor';
import { exportSinglePage, exportAllAsPdf } from './lib/export-pdf';
import { useDropZone } from './hooks/use-drop-zone';
import { Header } from './components/header';
import { PageSidebar } from './components/page-sidebar';
import { DocumentViewer } from './components/document-viewer';
import { ToolsPanel } from './components/tools-panel';
import { Dialog } from './components/ui/dialog';

export default function App() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);

  const store = useScannerStore;
  const pages = store((s) => s.pages);
  const activePageId = store((s) => s.activePageId);
  const activePage = store((s) => s.activePage());
  const dialog = store((s) => s.dialog);

  // Init worker + load from DB
  useEffect(() => {
    getWorker();
    store.getState().loadFromDB();
    return () => terminateWorker();
  }, []);

  // Save to DB when pages change
  useEffect(() => {
    if (pages.length === 0) return;
    const t = setTimeout(() => store.getState().saveToDB(), 1000);
    return () => clearTimeout(t);
  }, [pages]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e) => {
      if (pages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pages.length]);

  // Shared file processing logic
  const addFiles = useCallback(async (files) => {
    store.getState().setProcessing(true, 'Processing files...');
    const count = await processFiles(
      files,
      (page) => store.getState().addPage(page),
      (msg) => store.getState().setProcessing(true, msg),
    );
    store.getState().setProcessing(false);
    if (count > 0) showToast(`Added ${count} page(s)`);
    return count;
  }, []);

  // File input handler
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    await addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop
  const isDragging = useDropZone(addFiles);

  // Wait for canvas to finish drawing before reading pixels
  const waitForCanvas = useCallback(() => {
    return new Promise((resolve) => {
      const check = () => {
        if (canvasRef.current?.dataset.ready === 'true') {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }, []);

  // Scan: one incremental B&W contrast step on the current page
  const handleScanStep = useCallback(async () => {
    const page = store.getState().activePage();
    if (!page) return;

    store.getState().setProcessing(true, 'Scanning...');
    try {
      await waitForCanvas();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const previousSrc = canvas.toDataURL('image/png');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await getWorker().process('scan', {
        imageData: imageData.data,
        width: canvas.width,
        height: canvas.height,
      });

      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(result.data), result.width, result.height),
        0,
        0,
      );
      store.getState().pushEnhanceHistory(previousSrc);
      store.getState().updatePage(page.id, { src: canvas.toDataURL('image/png') });
    } catch (err) {
      showToast(`Scan failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, []);

  // Step back: restore the page to the state before the last scan
  const handleStepBack = useCallback(() => {
    const s = store.getState();
    const page = s.activePage();
    if (!page || s.enhanceHistory.length === 0) return;
    const previousSrc = s.enhanceHistory[s.enhanceHistory.length - 1];
    store.getState().updatePage(page.id, { src: previousSrc });
    store.getState().popEnhanceHistory();
  }, []);

  // Rotate
  const rotateImage = useCallback((direction) => {
    const page = store.getState().activePage();
    if (!page) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = page.height;
      canvas.height = page.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((direction * 90 * Math.PI) / 180);
      ctx.drawImage(img, -page.width / 2, -page.height / 2);
      store.getState().updatePage(page.id, {
        src: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.src = page.src;
  }, []);

  // Perspective crop
  const handleExecuteCrop = useCallback(async () => {
    const s = store.getState();
    const page = s.activePage();
    const cropPoints = s.cropPoints;
    if (!cropPoints || !page || !viewerRef.current) return;
    if (!isValidPolygon(cropPoints)) {
      showToast('Invalid crop shape', true);
      return;
    }

    store.getState().setProcessing(true, 'Applying perspective crop...');
    try {
      await waitForCanvas();

      const canvas = canvasRef.current;
      const rect = viewerRef.current.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const scaled = cropPoints.map((p) => ({ x: p.x * sx, y: p.y * sy }));

      const w1 = Math.hypot(scaled[1].x - scaled[0].x, scaled[1].y - scaled[0].y);
      const w2 = Math.hypot(scaled[2].x - scaled[3].x, scaled[2].y - scaled[3].y);
      const h1 = Math.hypot(scaled[3].x - scaled[0].x, scaled[3].y - scaled[0].y);
      const h2 = Math.hypot(scaled[2].x - scaled[1].x, scaled[2].y - scaled[1].y);
      const ow = Math.round(Math.max(w1, w2));
      const oh = Math.round(Math.max(h1, h2));

      if (ow < 10 || oh < 10) {
        showToast('Crop area too small', true);
        return;
      }
      if (ow > 10000 || oh > 10000) {
        showToast('Crop area too large', true);
        return;
      }

      const ctx = canvas.getContext('2d');
      const sourceData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await getWorker().process('transform', {
        sourceData: sourceData.data,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
        srcPoints: scaled,
        outputWidth: ow,
        outputHeight: oh,
      });

      const rc = document.createElement('canvas');
      rc.width = result.width;
      rc.height = result.height;
      rc.getContext('2d').putImageData(
        new ImageData(new Uint8ClampedArray(result.data), result.width, result.height),
        0,
        0,
      );

      store.getState().updatePage(page.id, {
        src: rc.toDataURL('image/png'),
        width: ow,
        height: oh,
      });
      store.getState().setCropMode(false);
      showToast('Crop applied');
    } catch (err) {
      showToast(`Crop failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, []);

  // Paint undo
  const handleUndo = useCallback(() => {
    const s = store.getState();
    const page = s.activePage();
    if (s.paintHistory.length === 0 || !page) return;
    const lastState = s.paintHistory[s.paintHistory.length - 1];
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      store.getState().updatePage(page.id, { src: canvas.toDataURL('image/png') });
    };
    img.src = lastState;
    store.getState().popPaintHistory();
  }, []);

  // Clear all paint
  const handleClearPaint = useCallback(() => {
    const page = store.getState().activePage();
    if (!page) return;
    store.getState().updatePage(page.id, {
      src: page.originalSrc,
      width: page.originalWidth,
      height: page.originalHeight,
    });
    useScannerStore.setState({ paintHistory: [] });
  }, []);

  // Export
  const handleExport = useCallback(
    (type) => {
      if (!canvasRef.current || !activePage) return;
      exportSinglePage(canvasRef.current, activePage.name, type);
    },
    [activePage],
  );

  const handleExportAll = useCallback(async () => {
    store.getState().setProcessing(true);
    try {
      await exportAllAsPdf(pages, (msg) => store.getState().setProcessing(true, msg));
    } catch (err) {
      showToast(`Export failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, [pages]);

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <PageSidebar
          fileInputRef={fileInputRef}
          onRotateLeft={() => rotateImage(-1)}
          onRotateRight={() => rotateImage(1)}
        />
        <DocumentViewer
          canvasRef={canvasRef}
          containerRef={containerRef}
          viewerRef={viewerRef}
          fileInputRef={fileInputRef}
        />
        <ToolsPanel
          onScanStep={handleScanStep}
          onStepBack={handleStepBack}
          onExecuteCrop={handleExecuteCrop}
          onUndo={handleUndo}
          onClearPaint={handleClearPaint}
          onExport={handleExport}
          onExportAll={handleExportAll}
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*,application/pdf"
      />
      <div id="toast" className="toast" />
      <Dialog
        open={dialog.open}
        onClose={() => store.getState().setDialog({ ...dialog, open: false })}
        title={dialog.title}
        description={dialog.description}
        variant={dialog.variant}
        onConfirm={dialog.onConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-lg font-medium">Drop files to add pages</p>
            <p className="text-sm text-muted-foreground">Images and PDFs supported</p>
          </div>
        </div>
      )}
    </div>
  );
}
