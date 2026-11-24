import { RotateCcw, RotateCw, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useScannerStore } from '../store/scanner-store';
import { useObjectUrl } from '../hooks/use-object-url';

function PageThumbnail({ page, index, active, onSelect, onDelete }) {
  const src = useObjectUrl(page.blob);
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      tabIndex={0}
      role="listitem"
      aria-selected={active}
      className={cn(
        'group relative aspect-[3/4] h-full md:h-auto shrink-0 border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring',
        active ? 'border-primary ring-2 ring-primary/10' : 'border-border bg-white',
      )}
    >
      {src && <img src={src} className="w-full h-full object-cover" alt={`Page ${index + 1}`} />}
      <div className="absolute top-1 right-1 md:top-2 md:right-2 opacity-100 md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <Button variant="destructive" size="icon" className="h-6 w-6" onClick={onDelete} aria-label={`Delete page ${index + 1}`}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-background/90 border-t p-1 text-center text-[10px] font-medium text-muted-foreground truncate px-2">
        {index + 1}. {page.name}
      </div>
    </div>
  );
}

// The list of pages with its controls: a column beside the page on wide
// screens, a strip above it on narrow ones.
export function PageSidebar({ fileInputRef, onRotateLeft, onRotateRight }) {
  const pages = useScannerStore((s) => s.pages);
  const activePageId = useScannerStore((s) => s.activePageId);
  const setActivePageId = useScannerStore((s) => s.setActivePageId);
  const isProcessing = useScannerStore((s) => s.isProcessing);
  const setDialog = useScannerStore((s) => s.setDialog);
  const deleteAllPages = useScannerStore((s) => s.deleteAllPages);
  const deletePage = useScannerStore((s) => s.deletePage);
  const hasActive = pages.some((p) => p.id === activePageId);

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
    <aside className="bg-muted/10 flex flex-row md:flex-col border-b md:border-b-0 md:border-r h-24 md:h-auto md:w-64 shrink-0">
      <div className="p-2 md:p-4 border-r md:border-r-0 md:border-b flex flex-col justify-center">
        <div className="hidden md:flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>
          <span className="text-xs text-muted-foreground">{pages.length} Pages</span>
        </div>
        <div className="grid grid-cols-2 md:flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-7 md:w-7" onClick={onRotateLeft} disabled={!hasActive || isProcessing} aria-label="Rotate left">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-7 md:w-7" onClick={onRotateRight} disabled={!hasActive || isProcessing} aria-label="Rotate right">
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
          <div className="hidden md:block flex-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-7 md:w-7" onClick={() => fileInputRef.current?.click()} aria-label="Add pages">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-7 md:w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteAll} disabled={pages.length === 0} aria-label="Delete all">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-row md:flex-col gap-2 md:gap-4 p-2 md:p-4 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto" role="list">
        {pages.map((page, idx) => (
          <PageThumbnail
            key={page.id}
            page={page}
            index={idx}
            active={activePageId === page.id}
            onSelect={() => setActivePageId(page.id)}
            onDelete={(e) => handleDeletePage(e, page)}
          />
        ))}
        {pages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center md:flex-none md:p-8 border-2 border-dashed rounded-lg border-muted-foreground/25">
            <p className="text-sm text-muted-foreground">No pages</p>
          </div>
        )}
      </div>
    </aside>
  );
}
