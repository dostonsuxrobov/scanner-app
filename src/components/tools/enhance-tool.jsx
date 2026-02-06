import { Wand2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/button';
import { cn } from '../../lib/utils';
import { useScannerStore } from '../../store/scanner-store';

export function EnhanceTool({ onApply, onApplyAll, onReset }) {
  const enhanceMode = useScannerStore((s) => s.enhanceMode);
  const setEnhanceMode = useScannerStore((s) => s.setEnhanceMode);
  const enhanceIntensity = useScannerStore((s) => s.enhanceIntensity);
  const setEnhanceIntensity = useScannerStore((s) => s.setEnhanceIntensity);
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const pages = useScannerStore((s) => s.pages);

  const modes = [
    { id: 'auto', label: 'Auto', desc: 'Balanced' },
    { id: 'scan', label: 'Scan', desc: 'Clean B&W' },
    { id: 'lighten', label: 'Lighten', desc: 'Remove shadows' },
    { id: 'sharpen', label: 'Sharpen', desc: 'Increase clarity' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Document Enhancement</h3>
        <p className="text-xs text-muted-foreground">Transform photos into clean scanned documents.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setEnhanceMode(m.id)}
            className={cn(
              'p-2 rounded-md border text-left transition-all focus:outline-none focus:ring-2 focus:ring-ring',
              enhanceMode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
          >
            <div className="text-xs font-medium">{m.label}</div>
            <div className="text-[10px] text-muted-foreground">{m.desc}</div>
          </button>
        ))}
      </div>
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center justify-between">
          <label htmlFor="intensity" className="text-xs font-medium">Intensity</label>
          <span className="text-xs font-semibold tabular-nums bg-background px-2 py-0.5 rounded border">{enhanceIntensity}%</span>
        </div>
        <input id="intensity" type="range" min="0" max="100" value={enhanceIntensity} onChange={(e) => setEnhanceIntensity(+e.target.value)} className="intensity-slider w-full" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Subtle</span><span>Full</span>
        </div>
      </div>
      <Button className="w-full" onClick={onApply} disabled={isProcessing}>
        <Wand2 className="w-4 h-4 mr-2" /> Apply to This Page
      </Button>
      {pages.length > 1 && (
        <Button variant="outline" className="w-full" onClick={onApplyAll} disabled={isProcessing}>
          <Sparkles className="w-4 h-4 mr-2" /> Apply to All Pages
        </Button>
      )}
      <Button variant="outline" className="w-full" onClick={onReset}>
        <RefreshCw className="w-4 h-4 mr-2" /> Reset to Original
      </Button>
    </div>
  );
}