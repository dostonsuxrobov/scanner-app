// Blend mode, opacity, and locks of the active layer. Dragging the opacity
// slider previews live and records a single undo step when released.
import { useRef } from "react";
import { Lock, LockOpen, Grid2x2 } from "lucide-react";
import { BLEND_MODES, layerBounds } from "../../engine/layer.js";
import { setLayerProperty } from "../../commands/layer-commands.js";
import { useRuntime } from "../editor-context.js";
import { NumberField } from "../fields/number-field.jsx";

export function LayerProperties({ layer }) {
  const rt = useRuntime();
  const drag = useRef(null);

  const preview = (value) => {
    if (!drag.current) drag.current = rt.session.begin("Layer opacity");
    layer.opacity = value;
    rt.invalidate(layerBounds(layer));
  };
  const finish = () => {
    if (drag.current) rt.session.end(drag.current);
    drag.current = null;
  };

  return (
    <div className="ae-layer-props">
      <select
        aria-label="Blend mode"
        value={layer.blend}
        disabled={layer.locked}
        onChange={(e) => setLayerProperty(rt, layer.id, "blend", e.target.value, "Blend mode")}
      >
        {BLEND_MODES.map(([mode, label]) => (
          <option key={mode} value={mode}>
            {label}
          </option>
        ))}
      </select>
      <div className="ae-opacity">
        <NumberField label="Opacity" unit="%" min={0} max={100} value={layer.opacity} disabled={layer.locked} onChange={(v) => setLayerProperty(rt, layer.id, "opacity", v, "Layer opacity")} />
        <input
          type="range"
          aria-label="Opacity slider"
          min={0}
          max={100}
          value={layer.opacity}
          disabled={layer.locked}
          onChange={(e) => preview(Number(e.target.value))}
          onPointerUp={finish}
          onKeyUp={finish}
          onBlur={finish}
        />
      </div>
      <div className="ae-locks">
        <span className="ae-field-label">Lock</span>
        <button
          type="button"
          className="ae-icon-button"
          aria-pressed={layer.alphaLocked}
          title="Lock transparency: paint only where the layer already has pixels"
          aria-label="Lock transparency"
          onClick={() => setLayerProperty(rt, layer.id, "alphaLocked", !layer.alphaLocked, "Lock transparency")}
        >
          <Grid2x2 size={14} />
        </button>
        <button
          type="button"
          className="ae-icon-button"
          aria-pressed={layer.locked}
          title="Lock layer: prevent all changes"
          aria-label="Lock layer"
          onClick={() => setLayerProperty(rt, layer.id, "locked", !layer.locked, layer.locked ? "Unlock layer" : "Lock layer")}
        >
          {layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </button>
      </div>
    </div>
  );
}
