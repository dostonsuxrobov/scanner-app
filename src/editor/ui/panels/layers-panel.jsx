// Layers panel: properties of the active layer, the layer stack (top first),
// and layer actions.
import { useRef } from "react";
import { ArrowDown, ArrowUp, Copy, Merge, Plus, Trash2 } from "lucide-react";
import * as layers from "../../commands/layer-commands.js";
import { useRuntime, useSessionVersion } from "../editor-context.js";
import { LayerProperties } from "./layer-properties.jsx";
import { LayerRow } from "./layer-row.jsx";

export function LayersPanel() {
  const rt = useRuntime();
  useSessionVersion();
  const dragging = useRef(null);
  const doc = rt.session.doc;
  if (!doc) return null;
  const active = rt.session.activeLayer;
  const index = doc.layers.indexOf(active);
  const top = [...doc.layers].reverse();
  const actions = [
    [Plus, "New layer", () => layers.newLayer(rt), false],
    [Copy, "Duplicate layer", () => layers.duplicateActiveLayer(rt), !active],
    [ArrowUp, "Bring forward", () => layers.moveLayer(rt, 1), index >= doc.layers.length - 1],
    [ArrowDown, "Send backward", () => layers.moveLayer(rt, -1), index < 1],
    [Merge, "Merge down", () => layers.mergeDown(rt), index < 1],
    [Trash2, "Delete layer", () => layers.deleteActiveLayer(rt), doc.layers.length < 2],
  ];
  return (
    <section className="ae-panel ae-layers" aria-labelledby="ae-layers-title">
      <header className="ae-panel-head">
        <h2 id="ae-layers-title">Layers</h2>
        <span className="ae-count">{doc.layers.length}</span>
      </header>
      {active && <LayerProperties layer={active} />}
      <ul className="ae-layer-list" aria-label="Layer stack">
        {top.map((layer, i) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            doc={doc}
            index={doc.layers.length - 1 - i}
            version={rt.session.pixelVersion}
            active={layer.id === doc.activeId}
            onDragStart={(id) => (dragging.current = id)}
            onDropAt={(toIndex) => dragging.current && layers.reorderLayer(rt, dragging.current, toIndex)}
          />
        ))}
      </ul>
      <footer className="ae-layer-actions">
        {actions.map(([Icon, label, run, disabled]) => (
          <button key={label} type="button" className="ae-icon-button" title={label} aria-label={label} disabled={disabled} onClick={run}>
            <Icon size={15} />
          </button>
        ))}
      </footer>
    </section>
  );
}
