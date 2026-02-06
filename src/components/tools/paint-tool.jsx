import { Undo2, Eraser } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/button';
import { cn } from '../../lib/utils';
import { useScannerStore } from '../../store/scanner-store';
import { MAX_UNDO_STATES } from '../../lib/utils';

const COLORS = [
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080',
  '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#f2f2f2', '#ffffff',
];

export function PaintTool({ onUndo, onClearAll }) {
  const brushColor = useScannerStore((s) => s.brushColor);
  const setBrushColor = useScannerStore((s) => s.setBrushColor);
  const brushSize = useScannerStore((s) => s.brushSize);
  const setBrushSize = useScannerStore((s) => s.setBrushSize);
  const paintHistory = useScannerStore((s) => s.paintHistory);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Correction Tool</h3>
        <p className="text-xs text-muted-foreground">Use white to erase marks, black to fill text. Ctrl+Z to undo.</p>
      </div>
      <div>
        <label className="text-xs font-medium mb-2 block">Shade</label>
        <div className="grid grid-cols-6 gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBrushColor(c)}
              className={cn('w-8 h-8 rounded border transition-all focus:outline-none focus:ring-2 focus:ring-ring', brushColor === c ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'border-border hover:scale-105')}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="brush-size" className="text-xs font-medium mb-2 block">Brush Size: {brushSize}px</label>
        <input id="brush-size" type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(+e.target.value)} className="w-full accent-primary" />
      </div>
      <Separator />
      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={onUndo} disabled={paintHistory.length === 0}>
          <Undo2 className="w-4 h-4 mr-2" /> Undo Stroke
          {paintHistory.length > 0 && <span className="ml-auto text-xs text-muted-foreground">({paintHistory.length}/{MAX_UNDO_STATES})</span>}
        </Button>
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onClearAll}>
          <Eraser className="w-4 h-4 mr-2" /> Clear All Paint
        </Button>
      </div>
    </div>
  );
}