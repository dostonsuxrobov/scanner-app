import { useRef, useEffect, useCallback, useState } from "react";
import { useScannerStore } from "./store/scanner-store";
import { showToast, isValidPolygon } from "./lib/utils";
import { getWorker, terminateWorker } from "./lib/image-worker-client";
import { processFiles } from "./lib/file-processor";
import { exportSinglePage, exportAllAsPdf } from "./lib/export-pdf";
import { useDropZone } from "./hooks/use-drop-zone";
import { AdvancedEditor } from "./editor/ui/advanced-editor.jsx";
import { fileKind } from "./editor/engine/io/file-kind.js";
import { Header } from "./components/header";
import { PageSidebar } from "./components/page-sidebar";
import { DocumentViewer } from "./components/document-viewer";
import { ToolsPanel } from "./components/tools-panel";
import { Dialog } from "./components/ui/dialog";

export default function App() {
  const [advanced, setAdvanced] = useState(false);
  const editorRef = useRef(null);
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
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pages.length]);

  // Shared file processing logic
  const addFiles = useCallback(async (files) => {
    store.getState().setProcessing(true, "Processing files...");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag and drop: into the editor while it is open, otherwise as pages.
  const dropFiles = useCallback(
    (files) => (advanced ? editorRef.current?.openFiles(files) : addFiles(files)),
    [advanced, addFiles],
  );
  const acceptDrop = useCallback(
    (file) => (advanced ? fileKind(file) !== "unknown" : file.type.startsWith("image/") || file.type === "application/pdf"),
    [advanced],
  );
  const isDragging = useDropZone(dropFiles, acceptDrop);

  // Wait for canvas to finish drawing before reading pixels
  const waitForCanvas = useCallback(() => {
    return new Promise((resolve) => {
      const check = () => {
        if (canvasRef.current?.dataset.ready === "true") {
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

    store.getState().setProcessing(true, "Scanning...");
    try {
      await waitForCanvas();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const previousSrc = canvas.toDataURL("image/png");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await getWorker().process("scan", {
        imageData: imageData.data,
        width: canvas.width,
        height: canvas.height,
      });

      ctx.putImageData(
        new ImageData(
          new Uint8ClampedArray(result.data),
          result.width,
          result.height,
        ),
        0,
        0,
      );
      store.getState().pushEnhanceHistory({ src: previousSrc, width: canvas.width, height: canvas.height });
      store
        .getState()
        .updatePage(page.id, { src: canvas.toDataURL("image/png") });
    } catch (err) {
      showToast(`Scan failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, []);

  // One-click fix: find the page's edges, straighten it, and clean it up.
  const handleOneClickFix = useCallback(async () => {
    const page = store.getState().activePage();
    if (!page) return;

    store.getState().setProcessing(true, "Finding the page and cleaning it up...");
    try {
      await waitForCanvas();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const previous = { src: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await getWorker().process(
        "oneClickFix",
        {
          imageData: imageData.data,
          width: canvas.width,
          height: canvas.height,
          modelUrl: new URL("models/uvdoc-v1.onnx", document.baseURI).href,
        },
        ({ fraction }) =>
          store.getState().setProcessing(
            true,
            fraction == null
              ? "Downloading the page-flattening AI (first time only)..."
              : `Downloading the page-flattening AI (first time only)... ${Math.round(fraction * 100)}%`,
          ),
      );

      const out = document.createElement("canvas");
      out.width = result.width;
      out.height = result.height;
      out.getContext("2d").putImageData(
        new ImageData(new Uint8ClampedArray(result.data), result.width, result.height),
        0,
        0,
      );
      store.getState().pushEnhanceHistory(previous);
      store.getState().updatePage(page.id, {
        src: out.toDataURL("image/png"),
        width: result.width,
        height: result.height,
      });
      const { method, paper, aiError } = result.info;
      const size = paper ? ` to ${paper}` : "";
      const message = {
        curved: `Curved page flattened${size} and cleaned up`,
        perspective: `Page straightened${size} and cleaned up`,
        none: "Couldn't find the page — cleaned up the whole image",
      }[method];
      showToast(aiError ? `${message} (AI flattening unavailable: ${aiError})` : message, !!aiError && method === "none");
    } catch (err) {
      showToast(`One-click fix failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, []);

  // Step back: undo the last Scan or One-click fix (including its crop)
  const handleStepBack = useCallback(() => {
    const s = store.getState();
    const page = s.activePage();
    if (!page || s.enhanceHistory.length === 0) return;
    const previous = s.enhanceHistory[s.enhanceHistory.length - 1];
    store.getState().updatePage(page.id, { src: previous.src, width: previous.width, height: previous.height });
    store.getState().popEnhanceHistory();
  }, []);

  // Reset everything — discard all edits and return to the uploaded original
  const handleResetAll = useCallback(() => {
    const page = store.getState().activePage();
    if (!page) return;
    store.getState().updatePage(page.id, {
      src: page.originalSrc,
      width: page.originalWidth,
      height: page.originalHeight,
    });
    store.getState().setCropMode(false);
    useScannerStore.setState({ paintHistory: [], enhanceHistory: [] });
    showToast("Reset to original");
  }, []);

  // Rotate
  const rotateImage = useCallback((direction) => {
    const page = store.getState().activePage();
    if (!page) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = page.height;
      canvas.height = page.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((direction * 90 * Math.PI) / 180);
      ctx.drawImage(img, -page.width / 2, -page.height / 2);
      store.getState().updatePage(page.id, {
        src: canvas.toDataURL("image/png"),
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
      showToast("Invalid crop shape", true);
      return;
    }

    store.getState().setProcessing(true, "Applying perspective crop...");
    try {
      await waitForCanvas();

      const canvas = canvasRef.current;
      const rect = viewerRef.current.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const scaled = cropPoints.map((p) => ({ x: p.x * sx, y: p.y * sy }));

      const w1 = Math.hypot(
        scaled[1].x - scaled[0].x,
        scaled[1].y - scaled[0].y,
      );
      const w2 = Math.hypot(
        scaled[2].x - scaled[3].x,
        scaled[2].y - scaled[3].y,
      );
      const h1 = Math.hypot(
        scaled[3].x - scaled[0].x,
        scaled[3].y - scaled[0].y,
      );
      const h2 = Math.hypot(
        scaled[2].x - scaled[1].x,
        scaled[2].y - scaled[1].y,
      );
      const ow = Math.round(Math.max(w1, w2));
      const oh = Math.round(Math.max(h1, h2));

      if (ow < 10 || oh < 10) {
        showToast("Crop area too small", true);
        return;
      }
      if (ow > 10000 || oh > 10000) {
        showToast("Crop area too large", true);
        return;
      }

      const ctx = canvas.getContext("2d");
      const sourceData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await getWorker().process("transform", {
        sourceData: sourceData.data,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
        srcPoints: scaled,
        outputWidth: ow,
        outputHeight: oh,
      });

      const rc = document.createElement("canvas");
      rc.width = result.width;
      rc.height = result.height;
      rc.getContext("2d").putImageData(
        new ImageData(
          new Uint8ClampedArray(result.data),
          result.width,
          result.height,
        ),
        0,
        0,
      );

      store.getState().updatePage(page.id, {
        src: rc.toDataURL("image/png"),
        width: ow,
        height: oh,
      });
      store.getState().setCropMode(false);
      showToast("Crop applied");
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
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      store
        .getState()
        .updatePage(page.id, { src: canvas.toDataURL("image/png") });
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
      await exportAllAsPdf(pages, (msg) =>
        store.getState().setProcessing(true, msg),
      );
    } catch (err) {
      showToast(`Export failed: ${err.message}`, true);
    } finally {
      store.getState().setProcessing(false);
    }
  }, [pages]);

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans">
      <Header advanced={advanced} onToggleMode={() => setAdvanced((v) => !v)} />
      <AdvancedEditor ref={editorRef} visible={advanced} />
      <div
        className="flex-1 flex overflow-hidden"
        style={advanced ? { display: "none" } : undefined}
      >
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
          onOneClickFix={handleOneClickFix}
          onResetAll={handleResetAll}
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-lg font-medium">
              {advanced ? "Drop to open in the editor" : "Drop files to add pages"}
            </p>
            <p className="text-sm text-muted-foreground">
              {advanced
                ? "Images, PDFs, and projects · added as layers when an image is open"
                : "Images and PDFs supported"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
