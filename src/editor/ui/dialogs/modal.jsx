// Dialog shell: focuses its first field, closes on Esc or backdrop click.
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, footer, wide = false, labelledBy = "ae-modal-title" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const first = ref.current?.querySelector("[data-autofocus], input, select, textarea, button:not(.ae-modal-close)");
    first?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div
      className="ae-modal-backdrop"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
    >
      <div ref={ref} className={`ae-modal${wide ? " ae-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header className="ae-modal-head">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="ae-icon-button ae-modal-close" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="ae-modal-body">{children}</div>
        {footer && <footer className="ae-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
