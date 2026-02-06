import { Sparkles, Crop, Paintbrush, Download, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/button';
import { cn } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';
import { EnhanceTool } from './tools/enhance-tool';
import { CropTool } from './tools/crop-tool';
import { PaintTool } from './tools/paint-tool';
import { ExportTool } from './tools/export-tool';

const TABS = [
  { id: 'enhance', icon: Sparkles, label: 'Enhance' },
  { id: 'edit', icon: Crop, label: 'Edit' },
  { id: 'paint', icon: Paintbrush, label: 'Paint' },
  { id: 'export', icon: Download, label: 'Export' },
];

export function ToolsPanel({ onApply, onApplyAll, onReset, onExecuteCrop, onUndo, onClearPaint, onExport, onExportAll }) {
  const rightPanelOpen = useScannerStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useScannerStore((s) => s.setRightPanelOpen);
  const activeTool = useScannerStore((s) => s.activeTool);
  const setActiveTool = useScannerStore((s) => s.setActiveTool);
  const activePage = useScannerStore((s) => s.activePage());

  return (
    <aside className={cn('bg-background border-l flex flex-col transition-all duration-300', rightPanelOpen ? 'w-80' : 'w-14')}>
      <div className="h-12 border-b flex items-center px-2 justify-between">
        {rightPanelOpen && <span className="font-semibold text-sm px-2">Tools</span>}
        <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(!rightPanelOpen)} aria-label={rightPanelOpen ? 'Collapse' : 'Expand'}>
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className={cn('grid gap-1 p-2', rightPanelOpen ? 'grid-cols-4' : 'grid-cols-1')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md py-2 px-1 text-[10px] font-medium transition-colors uppercase focus:outline-none focus:ring-2 focus:ring-ring',
                activeTool === t.id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <t.icon className="w-4 h-4" />
              {rightPanelOpen && <span>{t.label}</span>}
            </button>
          ))}
        </div>
        <Separator />
        {rightPanelOpen && activePage && (
          <div className="p-4">
            {activeTool === 'enhance' && <EnhanceTool onApply={onApply} onApplyAll={onApplyAll} onReset={onReset} />}
            {activeTool === 'edit' && <CropTool onExecuteCrop={onExecuteCrop} />}
            {activeTool === 'paint' && <PaintTool onUndo={onUndo} onClearAll={onClearPaint} />}
            {activeTool === 'export' && <ExportTool onExport={onExport} onExportAll={onExportAll} />}
          </div>
        )}
        {rightPanelOpen && !activePage && (
          <div className="p-8 text-center text-xs text-muted-foreground">Select a page to view tools.</div>
        )}
      </div>
    </aside>
  );
}