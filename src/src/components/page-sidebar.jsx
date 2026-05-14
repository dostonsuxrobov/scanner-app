import { RotateCcw, RotateCw, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';

export function PageSidebar({ fileInputRef, onRotateLeft, onRotateRight }) {
  const pages = useScannerStore((s) => s.pages);
  const activePageId = useScannerStore((s) => s.activePageId);
  const setActivePageId = useScannerStore((s) => s.setActivePageId);
  const activePage = useScannerStore((s) => s.activePage());
  const setDialog = useScannerStore((s) => s.setDialog);
  const deleteAllPages = useScannerStore((s) => s.deleteAllPages);
  const deletePage = useScannerStore((s) => s.deletePage);

  const handleDeleteAll = () => {
    if (pages.length === 0) return;
    setDialog({
      open: true,
      title: 'Delete All Pages',
      description: `Are you sure you want to delete all ${pages.length} page(s)? This action cannot be undone.`,
      variant: 'destructive',
      onConfirm: deleteAllPages,
    });
  };

  const handleDeletePage = (e, page) => {
    e.stopPropagation();
    setDialog({
      open: true,
      title: 'Delete Page',
      description: `Are you sure you want to delete "${page.name}"?`,
      variant: 'destructive',
      onConfirm: () => deletePage(page.id),
    });
  };

  return (
    <aside className="w-64 border-r bg-muted/10 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>
          <span className="text-xs text-muted-foreground">{pages.length} Pages</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRotateLeft} disabled={!activePage} aria-label="Rotate left">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRotateRight} disabled={!activePage} aria-label="Rotate right">
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} aria-label="Add pages">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteAll} disabled={pages.length === 0} aria-label="Delete all">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pages.map((page, idx) => (
          <div
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            tabIndex={0}
            role="listitem"
            aria-selected={activePageId === page.id}
            className={cn(
              'group relative aspect-[3/4] border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring',
              activePageId === page.id ? 'border-primary ring-2 ring-primary/10' : 'border-border bg-white',
            )}
          >
            <img src={page.src} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="destructive" size="icon" className="h-6 w-6" onClick={(e) => handleDeletePage(e, page)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-background/90 border-t p-1 text-center text-[10px] font-medium text-muted-foreground truncate px-2">
              {idx + 1}. {page.name}
            </div>
          </div>
        ))}
        {pages.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg border-muted-foreground/25">
            <p className="text-sm text-muted-foreground">No pages</p>
          </div>
        )}
      </div>
    </aside>
  );
}