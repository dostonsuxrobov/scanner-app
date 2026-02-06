import { ZoomIn, ZoomOut, ScanLine } from 'lucide-react';
import { Button } from './ui/button';
import { useScannerStore } from '../store/scanner-store';

export function Header() {
  const zoom = useScannerStore((s) => s.zoom);
  const setZoom = useScannerStore((s) => s.setZoom);

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg tracking-tight">simple</span>
      </div>
      <div className="flex items-center border rounded-md">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setZoom((z) => Math.max(10, z - 10))} aria-label="Zoom out">
          <ZoomOut className="w-3 h-3" />
        </Button>
        <span className="w-12 text-center text-xs font-medium">{zoom}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setZoom((z) => Math.min(300, z + 10))} aria-label="Zoom in">
          <ZoomIn className="w-3 h-3" />
        </Button>
      </div>
    </header>
  );
}