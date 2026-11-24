import { Sparkles, Crop, Paintbrush, Download, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/button';
import { cn } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';
import { EnhanceTool } from './tools/enhance-tool';
import { CropTool } from './tools/crop-tool';
import { PaintTool } from './tools/paint-tool';
import { ExportTool } from './tools/export-tool';

const TABS = [
  { id: 'enhance', icon: Sparkles, label: 'Scan' },
  { id: 'edit', icon: Crop, label: 'Edit' },
  { id: 'paint', icon: Paintbrush, label: 'Paint' },
  { id: 'export', icon: Download, label: 'Export' },
];

// The tool tabs and the active tool's controls: a column beside the page on
// wide screens, a sheet below it on narrow ones.
export function ToolsPanel({ onScanStep, onUndo, onOneClickFix, onResetAll, onExecuteCrop, onExport, onExportAll }) {
  const rightPanelOpen = useScannerStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useScannerStore((s) => s.setRightPanelOpen);
  const activeTool = useScannerStore((s) => s.activeTool);
  const setActiveTool = useScannerStore((s) => s.setActiveTool);
  const activePage = useScannerStore((s) => s.activePage());
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const edited = activePage && activePage.blob !== activePage.original.blob;

  return (
    <aside
      className={cn(
        'bg-background border-t md:border-t-0 md:border-l flex flex-col transition-all duration-300 shrink-0 min-h-0',
        rightPanelOpen ? 'max-h-[46vh] md:max-h-none md:w-80' : 'md:w-14',
      )}
    >
      <div className="hidden md:flex h-12 border-b items-center px-2 justify-between">
        {rightPanelOpen && <span className="font-semibold text-sm px-2">Tools</span>}
        <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(!rightPanelOpen)} aria-label={rightPanelOpen ? 'Collapse' : 'Expand'}>
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className={cn('grid gap-1 p-2 grid-cols-4', !rightPanelOpen && 'md:grid-cols-1')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              // On a narrow screen, tapping the open tool's tab folds the sheet away.
              onClick={() => (activeTool === t.id && rightPanelOpen ? setRightPanelOpen(false) : setActiveTool(t.id))}
              aria-pressed={activeTool === t.id}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md py-2 px-1 text-[10px] font-medium transition-colors uppercase focus:outline-none focus:ring-2 focus:ring-ring',
                activeTool === t.id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <t.icon className="w-4 h-4" />
              <span className={cn(!rightPanelOpen && 'md:hidden')}>{t.label}</span>
            </button>
          ))}
        </div>
        {rightPanelOpen && <Separator />}
        {rightPanelOpen && activePage && (
          <div className="p-4 space-y-4">
            {activeTool === 'enhance' && <EnhanceTool onScanStep={onScanStep} onUndo={onUndo} onOneClickFix={onOneClickFix} />}
            {activeTool === 'edit' && <CropTool onExecuteCrop={onExecuteCrop} />}
            {activeTool === 'paint' && <PaintTool onUndo={onUndo} />}
            {activeTool === 'export' && <ExportTool onExport={onExport} onExportAll={onExportAll} />}
            <Separator />
            <Button variant="outline" className="w-full" onClick={onResetAll} disabled={isProcessing || !edited}>
              <RotateCcw className="w-4 h-4 mr-2" /> Reset to Original
            </Button>
          </div>
        )}
        {rightPanelOpen && !activePage && (
          <div className="p-4 md:p-8 text-center text-xs text-muted-foreground">Select a page to view tools.</div>
        )}
      </div>
    </aside>
  );
}
