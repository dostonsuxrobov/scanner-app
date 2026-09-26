// Application-style menu bar: click to open, hover to switch menus, arrow
// keys to move, Enter to choose, Esc to close.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { COMMANDS, shortcutFor } from "../../keymap/keymap.js";
import { formatCombo } from "../../keymap/combo.js";
import { useRuntime } from "../editor-context.js";

function MenuItems({ items, onDone }) {
  const rt = useRuntime();
  const [sub, setSub] = useState(null);
  return items.map((item, i) => {
    if (item.separator) return <div key={i} className="ae-menu-sep" role="separator" />;
    if (item.heading)
      return (
        <div key={i} className={`ae-menu-heading${item.sub ? " is-sub" : ""}`} role="presentation">
          {item.heading}
        </div>
      );
    const shortcut = item.command ? shortcutFor(item.command) : null;
    const choose = () => {
      if (item.disabled || item.submenu) return;
      onDone();
      if (item.run) item.run();
      else COMMANDS[item.command]?.run(rt);
    };
    return (
      <div key={i} className="ae-menu-entry" onMouseEnter={() => setSub(item.submenu ? i : null)}>
        <button
          type="button"
          role="menuitem"
          className="ae-menu-item"
          disabled={item.disabled}
          aria-haspopup={item.submenu ? "menu" : undefined}
          aria-checked={item.checked ?? undefined}
          onClick={choose}
          onFocus={() => setSub(item.submenu ? i : null)}
          title={item.hint}
        >
          <span className="ae-menu-check">{item.checked && <Check size={13} />}</span>
          <span className="ae-menu-label">{item.label}</span>
          {shortcut && <kbd>{formatCombo(shortcut)}</kbd>}
          {item.submenu && <ChevronRight size={13} />}
        </button>
        {item.submenu && sub === i && !item.disabled && (
          <div className="ae-menu ae-submenu" role="menu">
            {item.submenu.length ? <MenuItems items={item.submenu} onDone={onDone} /> : <p className="ae-menu-empty">Nothing here yet</p>}
          </div>
        )}
      </div>
    );
  });
}

export function MenuBar({ menus }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (open === null) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(null);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(null);
        ref.current?.querySelectorAll(".ae-menubar-button")[open]?.focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setOpen((o) => (o + (e.key === "ArrowRight" ? 1 : -1) + menus.length) % menus.length);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...ref.current.querySelectorAll(".ae-menu:not(.ae-submenu) > .ae-menu-entry > .ae-menu-item:not(:disabled)")];
        const at = items.indexOf(document.activeElement);
        const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
        items[next]?.focus();
      }
      e.stopPropagation();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, menus.length]);

  return (
    <nav className="ae-menubar" ref={ref} aria-label="Editor menu" role="menubar">
      {menus.map((menu, i) => (
        <div key={menu.label} className="ae-menubar-slot">
          <button
            type="button"
            className="ae-menubar-button"
            aria-haspopup="menu"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
          >
            {menu.label}
          </button>
          {open === i && (
            <div className={`ae-menu${menu.compact ? " ae-menu-compact" : ""}`} role="menu" aria-label={menu.label}>
              <MenuItems items={menu.items} onDone={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
