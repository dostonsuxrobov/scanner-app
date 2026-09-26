// Top bar: menus, document name with unsaved marker, and the main file
// actions — always visible so finishing or starting over is obvious.
import { useMemo } from "react";
import { Download, FolderOpen, PanelRight, Redo2, Save, Undo2, X } from "lucide-react";
import { COMMANDS } from "../keymap/keymap.js";
import { useScannerStore } from "../../store/scanner-store";
import { MenuBar } from "./menus/menu-bar.jsx";
import { buildMenus } from "./menus/build-menus.js";
import { compactMenus } from "./menus/compact-menus.js";
import { useMediaQuery } from "../hooks/use-media-query.js";
import { useEditor, useRuntime, useSessionVersion } from "./editor-context.js";

export function TitleBar() {
  const rt = useRuntime();
  const version = useSessionVersion();
  const preferences = useEditor((s) => s.preferences);
  const pages = useScannerStore((s) => s.pages);
  const panelOpen = useEditor((s) => s.panelOpen);
  const compact = useMediaQuery("(max-width: 640px)");
  const menus = useMemo(() => {
    const full = buildMenus(rt, { pages, preferences });
    return compact ? compactMenus(full) : full;
  }, [rt, pages, preferences, version, compact]);
  const { session } = rt;
  const doc = session.doc;
  const run = (id) => () => COMMANDS[id].run(rt);

  return (
    <div className="ae-titlebar">
      <MenuBar menus={menus} />
      <div className="ae-docname" title={doc ? `${doc.name} — ${doc.width} × ${doc.height} px` : undefined}>
        {doc && (
          <>
            <span className="ae-docname-text">{doc.name}</span>
            {session.isDirty && <span className="ae-dirty" title="Unsaved changes" aria-label="Unsaved changes" />}
          </>
        )}
      </div>
      <div className="ae-titlebar-actions">
        <button type="button" className="ae-icon-button" aria-label="Undo" title={session.history.canUndo ? `Undo ${session.history.undoLabel} (Ctrl Z)` : "Undo"} disabled={!session.history.canUndo} onClick={run("undo")}>
          <Undo2 size={16} />
        </button>
        <button type="button" className="ae-icon-button" aria-label="Redo" title={session.history.canRedo ? `Redo ${session.history.redoLabel} (Ctrl Shift Z)` : "Redo"} disabled={!session.history.canRedo} onClick={run("redo")}>
          <Redo2 size={16} />
        </button>
        <span className="ae-divider" />
        <button type="button" className="ae-button ae-hide-narrow" onClick={run("open")} title="Open an image, PDF, or project (Ctrl O)">
          <FolderOpen size={15} /> Open
        </button>
        <button type="button" className="ae-button ae-hide-narrow" disabled={!doc} onClick={run("save")} title="Save an editable project with layers (Ctrl S)">
          <Save size={15} /> Save project
        </button>
        <button type="button" className="ae-button ae-primary" disabled={!doc} onClick={run("export")} title="Download as PNG, JPEG, WebP, or PDF (Ctrl Shift E)">
          <Download size={15} /> <span className="ae-hide-compact">Export</span>
        </button>
        <button type="button" className="ae-icon-button" disabled={!doc} onClick={run("close")} aria-label="Close image" title="Close image and start again">
          <X size={17} />
        </button>
        <button
          type="button"
          className="ae-icon-button ae-panel-toggle"
          aria-label="Show panels"
          aria-pressed={panelOpen}
          onClick={() => rt.store.setState({ panelOpen: !panelOpen })}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </div>
  );
}
