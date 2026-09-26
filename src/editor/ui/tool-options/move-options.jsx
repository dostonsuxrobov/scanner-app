import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical } from "lucide-react";
import { alignLayer } from "../../commands/layer-commands.js";
import { CheckField } from "../fields/check-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { useRuntime, useSessionVersion } from "../editor-context.js";
import { useToolOptions } from "./use-tool-options.js";
import { NumberField } from "../fields/number-field.jsx";
import { setLayerProperty } from "../../commands/layer-commands.js";

const ALIGN = [
  ["left", "Align left edges", AlignStartVertical],
  ["center", "Align horizontal centres", AlignCenterVertical],
  ["right", "Align right edges", AlignEndVertical],
  ["top", "Align top edges", AlignStartHorizontal],
  ["middle", "Align vertical centres", AlignCenterHorizontal],
  ["bottom", "Align bottom edges", AlignEndHorizontal],
];

export function MoveOptions() {
  const rt = useRuntime();
  useSessionVersion();
  const [o, set] = useToolOptions("move");
  const layer = rt.session.activeLayer;
  return (
    <>
      <Segmented
        label="Move"
        value={o.target}
        onChange={(v) => set("target", v)}
        options={[
          ["layer", "Layer"],
          ["pixels", "Pixels"],
          ["selection", "Outline"],
        ]}
      />
      {o.target === "layer" && (
        <CheckField label="Pick the layer under the pointer" checked={o.autoSelect} onChange={(v) => set("autoSelect", v)} title="Hold Ctrl/⌘ to switch this temporarily" />
      )}
      {layer && o.target !== "selection" && (
        <div className="ae-grid-2">
          <NumberField label="X" unit="px" value={layer.x} onChange={(v) => setLayerProperty(rt, layer.id, "x", v, "Move layer")} disabled={layer.locked} />
          <NumberField label="Y" unit="px" value={layer.y} onChange={(v) => setLayerProperty(rt, layer.id, "y", v, "Move layer")} disabled={layer.locked} />
        </div>
      )}
      {layer && (
        <div className="ae-field">
          <span className="ae-field-label">Align layer to canvas</span>
          <div className="ae-segmented ae-segmented-actions">
            {ALIGN.map(([how, label, Icon]) => (
              <button key={how} type="button" title={label} aria-label={label} onClick={() => alignLayer(rt, how)}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
