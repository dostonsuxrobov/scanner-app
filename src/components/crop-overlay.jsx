import { AlertCircle } from 'lucide-react';
import { useScannerStore } from '../store/scanner-store';
import { isValidPolygon } from '../lib/utils';

// The crop frame: four draggable corners over the page. Corners are kept in
// page pixels, so the frame stays on the same part of the page at any zoom;
// `scale` is screen pixels per page pixel.
export function CropOverlay({ scale, width, height }) {
  const cropPoints = useScannerStore((s) => s.cropPoints);
  const cropMode = useScannerStore((s) => s.cropMode);
  const setCropPoints = useScannerStore((s) => s.setCropPoints);

  if (!cropMode || !cropPoints) return null;

  const valid = isValidPolygon(cropPoints);
  const pts = cropPoints.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const pathData = `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
  const strokeColor = valid ? 'hsl(240,5.9%,10%)' : 'hsl(0,84.2%,60.2%)';

  // Each corner follows the pointer that grabbed it (mouse, pen or finger).
  const drag = (index) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const rect = e.currentTarget.parentElement.getBoundingClientRect();
      const point = {
        x: Math.max(0, Math.min(width, (e.clientX - rect.left) / scale)),
        y: Math.max(0, Math.min(height, (e.clientY - rect.top) / scale)),
      };
      setCropPoints((prev) => prev.map((p, i) => (i === index ? point : p)));
    },
  });

  const guide = (a, b) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />;

  return (
    <div className="absolute inset-0 z-20">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="cropMask">
            <rect width="100%" height="100%" fill="white" />
            <path d={pathData} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#cropMask)" />
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2" />
        {guide(mid(pts[0], pts[1]), mid(pts[3], pts[2]))}
        {guide(mid(pts[0], pts[3]), mid(pts[1], pts[2]))}
      </svg>
      {pts.map((point, i) => (
        <div key={i} className="crop-handle" style={{ left: point.x, top: point.y }} {...drag(i)} role="slider" aria-label={`Crop corner ${i + 1}`} />
      ))}
      {!valid && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-3 h-3" /> Invalid shape — corners overlapping
        </div>
      )}
    </div>
  );
}
