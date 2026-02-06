import { AlertCircle } from 'lucide-react';
import { useScannerStore } from '../store/scanner-store';
import { isValidPolygon } from '../lib/utils';

export { isValidPolygon };

export function CropOverlay({ viewerRef }) {
  const cropPoints = useScannerStore((s) => s.cropPoints);
  const cropMode = useScannerStore((s) => s.cropMode);
  const setCropPoints = useScannerStore((s) => s.setCropPoints);

  if (!cropMode || !cropPoints) return null;

  const valid = isValidPolygon(cropPoints);
  const pathData = `M ${cropPoints[0].x} ${cropPoints[0].y} L ${cropPoints[1].x} ${cropPoints[1].y} L ${cropPoints[2].x} ${cropPoints[2].y} L ${cropPoints[3].x} ${cropPoints[3].y} Z`;
  const strokeColor = valid ? 'hsl(240,5.9%,10%)' : 'hsl(0,84.2%,60.2%)';

  const handleMouseDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();

    const onMove = (ev) => {
      const rect = viewerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCropPoints((prev) => {
        const pts = [...prev];
        pts[index] = {
          x: Math.max(0, Math.min(ev.clientX - rect.left, rect.width)),
          y: Math.max(0, Math.min(ev.clientY - rect.top, rect.height)),
        };
        return pts;
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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
        <line x1={(cropPoints[0].x + cropPoints[1].x) / 2} y1={(cropPoints[0].y + cropPoints[1].y) / 2} x2={(cropPoints[3].x + cropPoints[2].x) / 2} y2={(cropPoints[3].y + cropPoints[2].y) / 2} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        <line x1={(cropPoints[0].x + cropPoints[3].x) / 2} y1={(cropPoints[0].y + cropPoints[3].y) / 2} x2={(cropPoints[1].x + cropPoints[2].x) / 2} y2={(cropPoints[1].y + cropPoints[2].y) / 2} stroke={strokeColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
      </svg>
      {cropPoints.map((point, i) => (
        <div key={i} className="crop-handle" style={{ left: point.x, top: point.y }} onMouseDown={(e) => handleMouseDown(i, e)} tabIndex={0} role="slider" aria-label={`Crop corner ${i + 1}`} />
      ))}
      {!valid && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-3 h-3" /> Invalid shape — corners overlapping
        </div>
      )}
    </div>
  );
}