import { Undo2, Paintbrush, Stamp, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/button';
import { cn } from '../../lib/utils';
import { useScannerStore } from '../../store/scanner-store';
import { ColorPicker } from '../ui/color-picker';

export function PaintTool({ onUndo }) {
  const brushColor = useScannerStore((s) => s.brushColor);
  const setBrushColor = useScannerStore((s) => s.setBrushColor);
  const brushSize = useScannerStore((s) => s.brushSize);
  const setBrushSize = useScannerStore((s) => s.setBrushSize);
  const steps = useScannerStore((s) => s.history.length);
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const picking = useScannerStore((s) => s.pickingCloneSource);
  const setPicking = useScannerStore((s) => s.setPickingCloneSource);
  const paintMode = useScannerStore((s) => s.paintMode);
  const setPaintMode = useScannerStore((s) => s.setPaintMode);
  const cloneSource = useScannerStore((s) => s.cloneSource);
  const setCloneSource = useScannerStore((s) => s.setCloneSource);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Correction Tool</h3>
        <p className="text-xs text-muted-foreground">
          {paintMode === 'brush'
            ? 'Pick any color from the wheel; drag the slider for darker shades. Ctrl+Z to undo.'
            : 'Set a source point (Alt+click, or Pick source and then tap the image), then drag to paint cloned pixels. Ctrl+Z to undo.'}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium mb-2 block">Mode</label>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          <button
            onClick={() => setPaintMode('brush')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
              paintMode === 'brush' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Paintbrush className="w-3.5 h-3.5" /> Brush
          </button>
          <button
            onClick={() => setPaintMode('clone')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
              paintMode === 'clone' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Stamp className="w-3.5 h-3.5" /> Clone
          </button>
        </div>
      </div>

      {paintMode === 'brush' && (
        <div>
          <label className="text-xs font-medium mb-2 block">Color</label>
          <ColorPicker color={brushColor} onChange={setBrushColor} />
        </div>
      )}

      {paintMode === 'clone' && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs flex items-center gap-2">
          <Target className={cn('w-4 h-4 shrink-0', cloneSource ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('flex-1', !cloneSource && 'text-muted-foreground')}>
            {picking ? 'Tap the image where to copy from.' : cloneSource ? (
              <>Source set at <span className="font-mono">{Math.round(cloneSource.x)}, {Math.round(cloneSource.y)}</span></>
            ) : 'No source point yet.'}
          </span>
          <button
            onClick={() => setPicking(!picking)}
            aria-pressed={picking}
            className={cn('underline-offset-2 hover:underline', picking ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground')}
          >
            {picking ? 'Cancel' : 'Pick source'}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="brush-size" className="text-xs font-medium mb-2 block">Brush Size: {brushSize}px</label>
        <input id="brush-size" type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(+e.target.value)} className="w-full accent-primary" />
      </div>
      <Separator />
      <Button variant="outline" className="w-full" onClick={onUndo} disabled={isProcessing || steps === 0}>
        <Undo2 className="w-4 h-4 mr-2" /> Undo
        {steps > 0 && <span className="ml-auto text-xs text-muted-foreground">({steps})</span>}
      </Button>
    </div>
  );
}
