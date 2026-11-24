import { useEffect, useCallback } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn, showToast } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';
import { usePagePaint } from '../hooks/use-page-paint';
import { useDragPan } from '../hooks/use-drag-pan';
import { useWheelZoom } from '../hooks/use-wheel-zoom';
import { CropOverlay } from './crop-overlay';
import { BrushCursor } from './brush-cursor';
import { CloneSourceMarker } from './clone-source-marker';

// The active page on its canvas, with zoom, pan, painting and the crop overlay.
export function DocumentViewer({ pageCanvas, canvasRef, containerRef, viewerRef, fileInputRef }) {
  const activePage = useScannerStore((s) => s.activePage());
  const zoom = useScannerStore((s) => s.zoom);
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const processingMessage = useScannerStore((s) => s.processingMessage);
  const activeTool = useScannerStore((s) => s.activeTool);
  const cropMode = useScannerStore((s) => s.cropMode);
  const brushColor = useScannerStore((s) => s.brushColor);
  const brushSize = useScannerStore((s) => s.brushSize);
  const paintMode = useScannerStore((s) => s.paintMode);
  const cloneSource = useScannerStore((s) => s.cloneSource);

  // Bring the canvas up to date when the page's picture changes underneath it.
  useEffect(() => {
    if (!activePage) return;
    pageCanvas.draw(activePage).catch(() => showToast(`"${activePage.name}" could not be shown`, true));
  }, [activePage?.id, activePage?.blob]);

  // Fit the page into the view when another page is chosen, when its size
  // changes (crop, rotate, fix), and when the tools panel opens or folds.
  const panelOpen = useScannerStore((s) => s.rightPanelOpen);
  useEffect(() => {
    const c = containerRef.current;
    if (!activePage || !c) return;
    const availW = c.clientWidth - 32, availH = c.clientHeight - 32;
    if (availW <= 0 || availH <= 0) return;
    const scale = Math.min(availW / activePage.width, availH / activePage.height);
    useScannerStore.getState().setZoom(Math.max(1, Math.floor(scale * 95)));
  }, [activePage?.id, activePage?.width, activePage?.height, panelOpen]);

  // Starting a crop: a frame a little inside the page (in page pixels).
  useEffect(() => {
    if (!cropMode || !activePage || useScannerStore.getState().cropPoints) return;
    const { width, height } = activePage;
    const pad = Math.min(width, height) * 0.1;
    useScannerStore.getState().setCropPoints([
      { x: pad, y: pad },
      { x: width - pad, y: pad },
      { x: width - pad, y: height - pad },
      { x: pad, y: height - pad },
    ]);
  }, [cropMode, activePage?.id, activePage?.blob]);

  useWheelZoom(containerRef, viewerRef, activePage?.id);
  const notCropping = useCallback(() => useScannerStore.getState().activeTool !== 'edit', []);
  const pan = useDragPan(containerRef, notCropping);
  const paint = usePagePaint(pageCanvas);

  if (!activePage) {
    return (
      <main ref={containerRef} id="main-content" className="flex-1 min-h-0 min-w-0 bg-muted/10 bg-dot-pattern overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No Document Selected</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Upload a PDF or Image to start editing, enhancing, and exporting.
          </p>
          <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
            Upload File
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Max 50MB per file · PDF limit: 100 pages</p>
        </div>
      </main>
    );
  }

  const displayW = activePage.width * (zoom / 100);
  const displayH = activePage.height * (zoom / 100);
  const painting = activeTool === 'paint' && !cropMode;

  return (
    <main
      ref={containerRef}
      id="main-content"
      className="flex-1 min-h-0 min-w-0 bg-muted/10 bg-dot-pattern overflow-auto"
      {...pan}
    >
      <div
        className="min-w-full min-h-full flex items-center justify-center p-4 md:p-8"
        style={{ minWidth: displayW + 32, minHeight: displayH + 32 }}
      >
        <div
          ref={viewerRef}
          className="relative shadow-xl bg-white flex-shrink-0"
          // While painting, a finger draws instead of scrolling the view.
          style={{ width: displayW, height: displayH, touchAction: painting ? 'none' : 'auto' }}
          {...paint}
        >
          <canvas ref={canvasRef} className={cn('w-full h-full block', painting ? 'cursor-none' : 'cursor-default')} />
          {painting && (
            <BrushCursor viewerRef={viewerRef} size={brushSize} color={paintMode === 'clone' ? 'transparent' : brushColor + '66'} />
          )}
          {painting && paintMode === 'clone' && cloneSource && (
            <CloneSourceMarker leftPct={(cloneSource.x / activePage.width) * 100} topPct={(cloneSource.y / activePage.height) * 100} />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-30">
              <div className="bg-white px-6 py-3 rounded-full shadow-lg border flex items-center gap-3 max-w-[90%]">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="text-sm font-medium">{processingMessage}</span>
              </div>
            </div>
          )}
          <CropOverlay scale={zoom / 100} width={activePage.width} height={activePage.height} />
        </div>
      </div>
    </main>
  );
}
