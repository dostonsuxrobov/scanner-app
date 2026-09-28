import { Wand2, Undo2, ScanLine } from 'lucide-react';
import { Button } from '../ui/button';
import { useScannerStore } from '../../store/scanner-store';

export function EnhanceTool({ onScanStep, onStepBack, onOneClickFix }) {
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const enhanceHistory = useScannerStore((s) => s.enhanceHistory);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Scan</h3>
        <p className="text-xs text-muted-foreground">
          Click <span className="font-medium">Scan</span> to push light pixels whiter and dark pixels blacker. Each click deepens the effect.
        </p>
      </div>
      <Button className="w-full" onClick={onScanStep} disabled={isProcessing}>
        <Wand2 className="w-4 h-4 mr-2" /> Scan
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={onStepBack}
        disabled={isProcessing || enhanceHistory.length === 0}
      >
        <Undo2 className="w-4 h-4 mr-2" /> Step Back
      </Button>
      <div className="pt-2 space-y-2">
        <Button variant="secondary" className="w-full" onClick={onOneClickFix} disabled={isProcessing}>
          <ScanLine className="w-4 h-4 mr-2" /> One-click fix
        </Button>
        <p className="text-xs text-muted-foreground">
          Finds the page edges, straightens the page, removes shadows, and sharpens the text. Step Back undoes it.
        </p>
      </div>
    </div>
  );
}
