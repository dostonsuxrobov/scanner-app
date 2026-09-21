import { ZoomIn, ZoomOut, ScanLine, Layers, ChevronsUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { useScannerStore } from '../store/scanner-store';

export function Header({ advanced = false, onToggleMode }) {
  const zoom = useScannerStore((s) => s.zoom);
  const setZoom = useScannerStore((s) => s.setZoom);

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-50">
      <button type="button" onClick={onToggleMode} aria-label={advanced ? 'Switch to Simple scanner' : 'Switch to Advanced editor'} aria-pressed={advanced} title={advanced ? 'Return to Simple scanner' : 'Open Advanced image editor'} className="flex items-center gap-2 rounded-lg px-2 py-1 -ml-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          {advanced ? <Layers className="w-5 h-5 text-primary-foreground" /> : <ScanLine className="w-5 h-5 text-primary-foreground" />}
        </div>
        <span className="font-semibold text-lg tracking-tight">{advanced ? 'advanced' : 'simple'}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      </button>
      {advanced ? <span className="text-xs text-muted-foreground">Image editor</span> : <div className="flex items-center border rounded-md">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setZoom((z) => Math.max(10, z - 10))} aria-label="Zoom out">
          <ZoomOut className="w-3 h-3" />
        </Button>
        <span className="w-12 text-center text-xs font-medium">{zoom}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setZoom((z) => Math.min(300, z + 10))} aria-label="Zoom in">
          <ZoomIn className="w-3 h-3" />
        </Button>
      </div>}
    </header>
  );
}