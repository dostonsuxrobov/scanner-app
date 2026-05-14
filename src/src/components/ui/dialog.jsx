import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export function Dialog({ open, onClose, title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, variant = 'default' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.focus();
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="relative bg-background rounded-lg shadow-xl border w-full max-w-md mx-4" role="alertdialog" aria-modal="true">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{title}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={() => { onConfirm(); onClose(); }}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}