import { FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/button';
import { useScannerStore } from '../../store/scanner-store';

export function ExportTool({ onExport, onExportAll }) {
  const pages = useScannerStore((s) => s.pages);
  const isProcessing = useScannerStore((s) => s.isProcessing);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-1">Export Current Page</h3>
        <p className="text-xs text-muted-foreground">Save current page to device.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: 'pdf', icon: <FileText className="w-6 h-6 text-red-500" />, label: 'PDF' },
          { type: 'png', icon: <ImageIcon className="w-6 h-6 text-green-500" />, label: 'PNG' },
          { type: 'jpg', icon: <ImageIcon className="w-6 h-6 text-blue-500" />, label: 'JPG' },
        ].map((item) => (
          <button key={item.type} onClick={() => onExport(item.type)} className="flex flex-col items-center justify-center p-4 rounded-lg border bg-card hover:bg-accent transition-colors gap-2 focus:outline-none focus:ring-2 focus:ring-ring">
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">PNG for best quality, JPG for smaller size</p>
      {pages.length > 1 && (
        <>
          <Separator />
          <div>
            <h3 className="font-medium text-sm mb-1">Export All Pages</h3>
            <p className="text-xs text-muted-foreground mb-3">Combine all pages into a single PDF.</p>
            <Button className="w-full" onClick={onExportAll} disabled={isProcessing}>
              <FileText className="w-4 h-4 mr-2" /> Export All as PDF ({pages.length} pages)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}