import { useRef, useEffect, useCallback, useState, useMemo, lazy, Suspense } from "react";
import { useScannerStore } from "./store/scanner-store";
import { showToast } from "./lib/utils";
import { getWorker, terminateWorker } from "./lib/image-worker-client";
import { processFiles } from "./lib/file-processor";
import { exportSinglePage, exportAllAsPdf } from "./lib/export-pdf";
import { createPageCanvas } from "./lib/page-canvas";
import { scanStep } from "./actions/scan-step";
import { fixPage } from "./actions/one-click-fix";
import { perspectiveCrop } from "./actions/perspective-crop";
import { rotatePage } from "./actions/rotate-page";
import { useDropZone } from "./hooks/use-drop-zone";
import { useSimpleShortcuts } from "./hooks/use-simple-shortcuts";
import { fileKind } from "./editor/engine/io/file-kind.js";
import { Header } from "./components/header";
import { PageSidebar } from "./components/page-sidebar";
import { DocumentViewer } from "./components/document-viewer";
import { ToolsPanel } from "./components/tools-panel";
import { DropHint } from "./components/drop-hint";
import { Dialog } from "./components/ui/dialog";

// The Advanced editor is a separate, larger program; it loads when first opened.
const AdvancedEditor = lazy(() => import("./editor/ui/advanced-editor.jsx").then((m) => ({ default: m.AdvancedEditor })));

const store = useScannerStore;

// Shows the busy overlay while `work` runs; a failure becomes a toast.
async function busy(message, failure, work) {
  store.getState().setProcessing(true, message);
  try {
    return await work();
  } catch (err) {
    showToast(`${failure}: ${err.message}`, true);
  } finally {
    store.getState().setProcessing(false);
  }
}

export default function App() {
  const [advanced, setAdvanced] = useState(false);
  const [editorOpened, setEditorOpened] = useState(false);
  const editorRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pageCanvas = useMemo(() => createPageCanvas(canvasRef), []);

  const pages = store((s) => s.pages);
  const activePage = store((s) => s.activePage());
  const dialog = store((s) => s.dialog);

  // Init worker + load from DB
  useEffect(() => {
    getWorker();
    store.getState().loadFromDB();
    return () => terminateWorker();
  }, []);

  // Save changed pages shortly after they change; warn before leaving only
  // while something is not yet stored.
  const unsaved = useRef(false);
  useEffect(() => {
    if (pages.length === 0) return;
    unsaved.current = true;
    const t = setTimeout(async () => {
      const stored = await store.getState().saveToDB();
      if (stored && store.getState().pages === pages) unsaved.current = false;
    }, 1000);
    return () => clearTimeout(t);
  }, [pages]);
  useEffect(() => {
    const handler = (e) => {
      if (!unsaved.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const addFiles = useCallback(async (files) => {
    store.getState().setProcessing(true, "Processing files...");
    const count = await processFiles(
      files,
      (page) => store.getState().addPage(page),
      (msg) => store.getState().setProcessing(true, msg),
    );
    store.getState().setProcessing(false);
    if (count > 0) showToast(`Added ${count} page(s)`);
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length > 0) await addFiles(files);
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

  const handleScanStep = useCallback(() => busy("Scanning...", "Scan failed", () => scanStep(pageCanvas)), [pageCanvas]);

  const handleOneClickFix = useCallback(
    () =>
      busy("Finding the page and cleaning it up...", "One-click fix failed", async () => {
        const done = await fixPage(pageCanvas);
        if (done) showToast(done.message, done.isError);
      }),
    [pageCanvas],
  );

  const handleExecuteCrop = useCallback(
    () =>
      busy("Applying perspective crop...", "Crop failed", async () => {
        if (!(await perspectiveCrop(pageCanvas))) return;
        store.getState().setCropMode(false);
        showToast("Crop applied");
      }),
    [pageCanvas],
  );

  const handleRotate = useCallback((direction) => busy("Rotating...", "Rotate failed", () => rotatePage(pageCanvas, direction)), [pageCanvas]);

  // One undo for every kind of edit. A stroke still being stored lands first.
  const handleUndo = useCallback(async () => {
    if (store.getState().isProcessing) return;
    await pageCanvas.settled();
    store.getState().undo();
  }, [pageCanvas]);

  const handleResetAll = useCallback(async () => {
    await pageCanvas.settled();
    if (store.getState().resetPage()) showToast("Reset to original — Step Back undoes it");
  }, [pageCanvas]);

  const handleCancel = useCallback(() => store.getState().setCropMode(false), []);
  useSimpleShortcuts(!advanced, { onUndo: handleUndo, onCancel: handleCancel });

  const handleExport = useCallback(
    (type) => {
      if (!canvasRef.current || !activePage) return;
      return exportSinglePage(canvasRef.current, activePage.name, type, activePage.paper);
    },
    [activePage],
  );

  const handleExportAll = useCallback(
    () => busy("Preparing the PDF...", "Export failed", () => exportAllAsPdf(pages, (msg) => store.getState().setProcessing(true, msg))),
    [pages],
  );

  const toggleMode = () => {
    setEditorOpened(true);
    setAdvanced((v) => !v);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background font-sans">
      <Header advanced={advanced} onToggleMode={toggleMode} />
      {editorOpened && (
        <Suspense fallback={advanced ? <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading the editor…</div> : null}>
          <AdvancedEditor ref={editorRef} visible={advanced} />
        </Suspense>
      )}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden"
        style={advanced ? { display: "none" } : undefined}
      >
        <PageSidebar
          fileInputRef={fileInputRef}
          onRotateLeft={() => handleRotate(-1)}
          onRotateRight={() => handleRotate(1)}
        />
        <DocumentViewer
          pageCanvas={pageCanvas}
          canvasRef={canvasRef}
          containerRef={containerRef}
          viewerRef={viewerRef}
          fileInputRef={fileInputRef}
        />
        <ToolsPanel
          onScanStep={handleScanStep}
          onUndo={handleUndo}
          onOneClickFix={handleOneClickFix}
          onResetAll={handleResetAll}
          onExecuteCrop={handleExecuteCrop}
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
      <div id="toast" className="toast" role="status" aria-live="polite" />
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
      {isDragging && <DropHint advanced={advanced} />}
    </div>
  );
}
