import { useEffect } from 'react';

const typing = (el) => el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(range|checkbox|radio|button|color)$/.test(el.type));

// Keyboard shortcuts of the simple scanner: Ctrl/Cmd+Z undoes, Esc cancels.
export function useSimpleShortcuts(enabled, { onUndo, onCancel }) {
  useEffect(() => {
    if (!enabled) return;
    const handle = (e) => {
      if (typing(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
      } else if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, onUndo, onCancel]);
}
