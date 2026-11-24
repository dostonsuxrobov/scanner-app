import { useRef, useCallback } from 'react';
import { useScannerStore } from '../store/scanner-store';

// Stamps a soft-edged disc of `snapshot` (the picture when the stroke began),
// taken at an offset from (x, y), onto the canvas. The soft edge lets
// repeated stamps blend.
function stampClone(ctx, snapshot, x, y, radius, offsetX, offsetY) {
  const size = Math.max(2, Math.ceil(radius * 2));
  const tmp = document.createElement('canvas');
  tmp.width = size;
  tmp.height = size;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(snapshot, x + offsetX - radius, y + offsetY - radius, size, size, 0, 0, size, size);
  tctx.globalCompositeOperation = 'destination-in';
  const grad = tctx.createRadialGradient(radius, radius, radius * 0.4, radius, radius, radius);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  tctx.fillStyle = grad;
  tctx.fillRect(0, 0, size, size);
  ctx.drawImage(tmp, x - radius, y - radius);
}

// Brush and clone strokes on the page canvas, for mouse, pen and touch.
// Returns pointer handlers for the element that wraps the canvas.
export function usePagePaint(pageCanvas) {
  // The stroke in progress: its pointer, the picture before it, and where it last was.
  const stroke = useRef(null);

  const locate = (e) => {
    const canvas = pageCanvas.element;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * (canvas.height / rect.height), scale };
  };

  const onPointerDown = useCallback((e) => {
    const s = useScannerStore.getState();
    const canvas = pageCanvas.element;
    if (e.button !== 0 || stroke.current || s.activeTool !== 'paint' || s.cropMode || s.isProcessing) return;
    if (!s.activePage() || canvas.dataset.ready !== 'true') return;
    const { x, y, scale } = locate(e);
    const cloning = s.paintMode === 'clone';
    if (cloning && (e.altKey || s.pickingCloneSource)) return s.setCloneSource({ x, y });
    if (cloning && !s.cloneSource) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const before = document.createElement('canvas');
    before.width = canvas.width;
    before.height = canvas.height;
    before.getContext('2d').drawImage(canvas, 0, 0);
    const radius = (s.brushSize * scale) / 2;
    const ctx = canvas.getContext('2d');
    stroke.current = {
      pointerId: e.pointerId, before, x, y, radius, cloning, color: s.brushColor,
      offsetX: cloning ? s.cloneSource.x - x : 0,
      offsetY: cloning ? s.cloneSource.y - y : 0,
    };
    if (cloning) stampClone(ctx, before, x, y, radius, stroke.current.offsetX, stroke.current.offsetY);
    else {
      // A dot, so a click or tap leaves a mark too.
      ctx.fillStyle = s.brushColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [pageCanvas]);

  const onPointerMove = useCallback((e) => {
    const st = stroke.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const { x, y } = locate(e);
    const ctx = pageCanvas.element.getContext('2d');
    if (st.cloning) {
      // Stamps along the segment, close enough to leave no gaps on fast strokes.
      const dx = x - st.x, dy = y - st.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, st.radius / 3)));
      for (let i = 1; i <= steps; i++) stampClone(ctx, st.before, st.x + (dx * i) / steps, st.y + (dy * i) / steps, st.radius, st.offsetX, st.offsetY);
    } else {
      ctx.strokeStyle = st.color;
      ctx.lineWidth = st.radius * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    st.x = x;
    st.y = y;
  }, [pageCanvas]);

  const finish = useCallback((e, keep) => {
    const st = stroke.current;
    if (!st || e.pointerId !== st.pointerId) return;
    stroke.current = null;
    const page = useScannerStore.getState().activePage();
    if (keep && page) pageCanvas.commit(page.id, page.paper);
    else pageCanvas.element.getContext('2d').drawImage(st.before, 0, 0); // an interrupted stroke leaves no trace
  }, [pageCanvas]);

  const onPointerUp = useCallback((e) => finish(e, true), [finish]);
  const onPointerCancel = useCallback((e) => finish(e, false), [finish]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
