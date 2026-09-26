// Bottom bar: pointer position, image size, selection size, hint, zoom.
import { useEditor, useRuntime, useSessionVersion, useView } from "./editor-context.js";
import { toolInfo } from "./tool-catalog.js";
import { ZoomControl } from "./zoom-control.jsx";

export function StatusBar() {
  const rt = useRuntime();
  useSessionVersion();
  const pointer = useView((s) => s.pointer);
  const tool = useEditor((s) => s.tool);
  const doc = rt.session.doc;
  const selection = rt.session.selection;
  return (
    <footer className="ae-status">
      <div className="ae-status-info">
        {doc ? (
          <>
            <span className="ae-status-cell" title="Pointer position">
              {pointer ? `${Math.floor(pointer.x)}, ${Math.floor(pointer.y)}` : "—"}
            </span>
            <span className="ae-status-cell">{doc.width} × {doc.height} px</span>
            {selection && (
              <span className="ae-status-cell" title="Selection bounds">
                Selection {selection.bounds.w} × {selection.bounds.h}
              </span>
            )}
            <span className="ae-status-hint">{toolInfo(tool).hint}</span>
          </>
        ) : (
          <span className="ae-status-hint">No image open</span>
        )}
      </div>
      <ZoomControl disabled={!doc} />
    </footer>
  );
}
