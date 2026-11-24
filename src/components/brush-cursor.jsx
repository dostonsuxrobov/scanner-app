import { useEffect, useRef } from 'react';

// A ring the size of the brush that follows the mouse or pen over `viewerRef`.
// (A finger covers the spot it paints, so touch shows none.)
export function BrushCursor({ viewerRef, size, color }) {
  const ring = useRef(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const move = (e) => {
      const el = ring.current;
      if (!el) return;
      if (e.pointerType === 'touch') return (el.style.display = 'none');
      const rect = viewer.getBoundingClientRect();
      el.style.left = e.clientX - rect.left + 'px';
      el.style.top = e.clientY - rect.top + 'px';
      el.style.display = 'block';
    };
    const leave = () => {
      if (ring.current) ring.current.style.display = 'none';
    };
    viewer.addEventListener('pointermove', move);
    viewer.addEventListener('pointerleave', leave);
    return () => {
      viewer.removeEventListener('pointermove', move);
      viewer.removeEventListener('pointerleave', leave);
    };
  }, [viewerRef]);

  return (
    <div
      ref={ring}
      className="absolute rounded-full pointer-events-none z-20"
      style={{
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        backgroundColor: color,
        border: '1.5px solid rgba(0,0,0,0.85)',
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.85)',
        display: 'none',
      }}
    />
  );
}
