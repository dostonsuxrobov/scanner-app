import { Crop, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useScannerStore } from '../../store/scanner-store';
import { isValidPolygon } from '../../lib/utils';

export function CropTool({ onExecuteCrop }) {
  const cropMode = useScannerStore((s) => s.cropMode);
  const setCropMode = useScannerStore((s) => s.setCropMode);
  const cropPoints = useScannerStore((s) => s.cropPoints);
  const isProcessing = useScannerStore((s) => s.isProcessing);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Perspective Crop</h3>
        <p className="text-xs text-muted-foreground">Drag the 4 corners to select your document. Corrects perspective automatically.</p>
      </div>
      {!cropMode ? (
        <Button className="w-full" onClick={() => setCropMode(true)}>
          <Crop className="w-4 h-4 mr-2" /> Start Crop
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="bg-muted/50 p-3 rounded-md border text-xs text-center text-muted-foreground">
            Drag corners to select document area
          </div>
          <Button className="w-full" onClick={onExecuteCrop} disabled={isProcessing || !isValidPolygon(cropPoints)}>
            <Check className="w-4 h-4 mr-2" /> Apply Crop
          </Button>
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setCropMode(false)}>
            Cancel (Esc)
          </Button>
        </div>
      )}
    </div>
  );
}