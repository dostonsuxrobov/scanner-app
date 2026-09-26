// Right-hand panels (a drawer on small screens).
import { useEditor, useRuntime, useSessionVersion } from "./editor-context.js";
import { LayersPanel } from "./panels/layers-panel.jsx";
import { ToolOptionsPanel } from "./tool-options/tool-options-panel.jsx";

export function SidePanels() {
  const rt = useRuntime();
  useSessionVersion();
  const open = useEditor((s) => s.panelOpen);
  return (
    <aside className={`ae-side${open ? " is-open" : ""}`} aria-label="Panels">
      {rt.session.hasDocument ? (
        <>
          <ToolOptionsPanel />
          <LayersPanel />
        </>
      ) : (
        <p className="ae-side-empty">Tool options and layers appear here once an image is open.</p>
      )}
    </aside>
  );
}
