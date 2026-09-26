// Vertical tool strip plus color swatches.
import { formatCombo } from "../keymap/combo.js";
import { ColorSwatches } from "./color-swatches.jsx";
import { useEditor, useRuntime } from "./editor-context.js";
import { TOOL_CATALOG } from "./tool-catalog.js";

const GROUP_BREAKS = new Set(["bycolor", "eraser", "ellipse"]);

export function Toolbox() {
  const rt = useRuntime();
  const active = useEditor((s) => s.tool);
  return (
    <nav className="ae-toolbox" aria-label="Tools">
      {TOOL_CATALOG.map(({ id, icon: Icon, label, key }) => (
        <div key={id} className="ae-tool-slot">
          <button
            type="button"
            className="ae-tool"
            aria-pressed={active === id}
            aria-label={label}
            title={`${label} (${formatCombo(key)})`}
            onClick={() => rt.setTool(id)}
          >
            <Icon size={18} strokeWidth={1.75} />
          </button>
          {GROUP_BREAKS.has(id) && <span className="ae-tool-break" />}
        </div>
      ))}
      <ColorSwatches />
    </nav>
  );
}
