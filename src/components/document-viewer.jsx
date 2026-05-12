import { useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';
import { CropOverlay } from './crop-overlay';

export function DocumentViewer({ canvasRef, containerRef, viewerRef, fileInputRef }) {
  const activePage = useScannerStore((s) => s.activePage());
  const zoom = useScannerStore((s) => s.zoom);
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const processingMessage = useScannerStore((s) => s.processingMessage);
  const activeTool = useScannerStore((s) => s.activeTool);
  const cropMode = useScannerStore((s) => s.cropMode);
  const brushColor = useScannerStore((s) => s.brushColor);
  const brushSize = useScannerStore((s) => s.brushSize);
  const updatePage = useScannerStore((s) => s.updatePage);
  const pushPaintHistory = useScannerStore((s) => s.pushPaintHistory);
  const isPaintingRef = useRef(false);
  const panRef = useRef({ active: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0 });
  const brushCursorRef = useRef(null);

  // Draw active page to canvas
  useEffect(() => {
    if (!activePage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = activePage.width;
      canvas.height = activePage.height;
      ctx.drawImage(img, 0, 0);
      canvas.dataset.ready = 'true';
    };
    canvas.dataset.ready = 'false';
    img.src = activePage.src;
  }, [activePage?.src]);

  // Auto-fit zoom
  useEffect(() => {
    if (activePage && containerRef.current) {
      const c = containerRef.current;
      const padding = 64;
      const availW = c.clientWidth - padding;
      const availH = c.clientHeight - padding;
      if (availW > 0 && availH > 0) {
        const scale = Math.min(availW / activePage.width, availH / activePage.height);
        useScannerStore.getState().setZoom(Math.floor(scale * 95));
      }
    }
  }, [activePage?.id]);

  // Init crop points
  useEffect(() => {
    if (cropMode && activePage && viewerRef.current) {
      const pts = useScannerStore.getState().cropPoints;
      if (!pts) {
        const rect = viewerRef.current.getBoundingClientRect();
        const pad = Math.min(rect.width, rect.height) * 0.1;
        useScannerStore.getState().setCropPoints([
          { x: pad, y: pad },
          { x: rect.width - pad, y: pad },
          { x: rect.width - pad, y: rect.height - pad },
          { x: pad, y: rect.height - pad },
        ]);
      }
    }
  }, [cropMode, activePage]);

  // Wheel zoom — anchored on cursor so the point under the mouse stays put
  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;
    if (!container || !viewer || !activePage) return;

    const handleWheel = (e) => {
      if (useScannerStore.getState().activeTool === 'edit') return;
      e.preventDefault();

      const currentZoom = useScannerStore.getState().zoom;
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newZoom = Math.max(10, Math.min(400, Math.round(currentZoom * factor)));
      if (newZoom === currentZoom) return;

      const viewerRect = viewer.getBoundingClientRect();
      const offsetInViewerX = e.clientX - viewerRect.left;
      const offsetInViewerY = e.clientY - viewerRect.top;
      const actualFactor = newZoom / currentZoom;
      const targetViewerLeft = e.clientX - offsetInViewerX * actualFactor;
      const targetViewerTop = e.clientY - offsetInViewerY * actualFactor;

      useScannerStore.getState().setZoom(newZoom);

      requestAnimationFrame(() => {
        const newRect = viewer.getBoundingClientRect();
        container.scrollLeft += newRect.left - targetViewerLeft;
        container.scrollTop += newRect.top - targetViewerTop;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [activePage?.id]);

  // Right-drag pan — adjusts container scroll while right mouse is held
  useEffect(() => {
    if (!activePage) return;

    const handleMove = (e) => {
      if (!panRef.current.active) return;
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = panRef.current.scrollX - (e.clientX - panRef.current.startX);
      container.scrollTop = panRef.current.scrollY - (e.clientY - panRef.current.startY);
    };
    const handleUp = (e) => {
      if (e.button === 2 && panRef.current.active) {
        panRef.current.active = false;
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [activePage?.id]);

  const handlePanStart = useCallback((e) => {
    if (e.button !== 2) return;
    if (useScannerStore.getState().activeTool === 'edit') return;
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();
    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollX: container.scrollLeft,
      scrollY: container.scrollTop,
    };
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleContextMenu = useCallback((e) => {
    if (useScannerStore.getState().activeTool === 'edit') return;
    e.preventDefault();
  }, []);

  // Brush-size cursor preview — follows the mouse while paint tool is active
  useEffect(() => {
    if (activeTool !== 'paint' || cropMode || !activePage) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const onMove = (e) => {
      const el = brushCursorRef.current;
      if (!el) return;
      const rect = viewer.getBoundingClientRect();
      el.style.left = e.clientX - rect.left + 'px';
      el.style.top = e.clientY - rect.top + 'px';
      el.style.display = 'block';
    };
    const onLeave = () => {
      if (brushCursorRef.current) brushCursorRef.current.style.display = 'none';
    };

    viewer.addEventListener('mousemove', onMove);
    viewer.addEventListener('mouseleave', onLeave);
    return () => {
      viewer.removeEventListener('mousemove', onMove);
      viewer.removeEventListener('mouseleave', onLeave);
    };
  }, [activeTool, cropMode, activePage?.id]);

  // Paint handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (activeTool !== 'paint' || cropMode || !activePage) return;
    const canvas = canvasRef.current;
    pushPaintHistory(canvas.toDataURL('image/png'));

    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize * sx;
    isPaintingRef.current = true;
  }, [activeTool, cropMode, activePage, brushColor, brushSize]);

  const handleMouseMove = useCallback((e) => {
    if (!isPaintingRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const ctx = canvas.getContext('2d');
    ctx.lineTo((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    ctx.stroke();
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      const newSrc = canvasRef.current.toDataURL('image/png');
      updatePage(activePage?.id, { src: newSrc });
    }
  }, [activePage?.id]);

  const displayW = activePage ? activePage.width * (zoom / 100) : 0;
  const displayH = activePage ? activePage.height * (zoom / 100) : 0;

  if (!activePage) {
    return (
      <main ref={containerRef} id="main-content" className="flex-1 bg-muted/10 bg-dot-pattern overflow-hidden flex items-center justify-center">
        <div className="text-center">
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

  return (
    <main
      ref={containerRef}
      id="main-content"
      className="flex-1 bg-muted/10 bg-dot-pattern overflow-auto"
      onMouseDown={handlePanStart}
      onContextMenu={handleContextMenu}
    >
      <div
        className="min-w-full min-h-full flex items-center justify-center p-8"
        style={{ minWidth: displayW + 64, minHeight: displayH + 64 }}
      >
        <div
          ref={viewerRef}
          className="relative shadow-xl bg-white flex-shrink-0"
          style={{ width: displayW, height: displayH }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            className={cn(
              'w-full h-full block',
              activeTool === 'paint' && !cropMode ? 'cursor-none' : 'cursor-default',
            )}
          />
          {activeTool === 'paint' && !cropMode && (
            <div
              ref={brushCursorRef}
              className="absolute rounded-full pointer-events-none z-20"
              style={{
                width: brushSize,
                height: brushSize,
                transform: 'translate(-50%, -50%)',
                backgroundColor: brushColor + '66',
                border: '1.5px solid rgba(0,0,0,0.85)',
                boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)',
                display: 'none',
              }}
            />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-30">
              <div className="bg-white px-6 py-3 rounded-full shadow-lg border flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">{processingMessage}</span>
              </div>
            </div>
          )}
          <CropOverlay viewerRef={viewerRef} />
        </div>
      </div>
    </main>
  );
}
