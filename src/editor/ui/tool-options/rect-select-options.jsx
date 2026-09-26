import { SelectField } from "../fields/select-field.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { useRuntime, useSessionVersion } from "../editor-context.js";
import { SelectionModeField } from "./selection-mode-field.jsx";
import { useToolOptions } from "./use-tool-options.js";

export function RectSelectOptions() {
  const rt = useRuntime();
  useSessionVersion();
  const [o, set] = useToolOptions("select");
  const shape = rt.session.selection?.shape;
  const rect = shape?.type === "rect" ? shape.rect : null;
  const edit = (key, value) => rt.tools.select.setRect(rt, { ...rect, [key]: value });
  return (
    <>
      <SelectionModeField value={o.mode} onChange={(v) => set("mode", v)} />
      <SliderField label="Feather" unit="px" min={0} max={100} value={o.feather} onChange={(v) => set("feather", v)} />
      <SliderField label="Rounded corners" unit="px" min={0} max={500} value={o.radius} onChange={(v) => set("radius", v)} />
      <SelectField
        label="Shape"
        value={o.style}
        onChange={(v) => set("style", v)}
        options={[
          ["free", "Free"],
          ["ratio", "Fixed ratio"],
          ["fixed", "Fixed size"],
        ]}
      />
      {o.style === "ratio" && (
        <div className="ae-grid-2">
          <NumberField label="Width" value={o.ratioW} min={0.01} decimals={2} onChange={(v) => set("ratioW", v)} />
          <NumberField label="Height" value={o.ratioH} min={0.01} decimals={2} onChange={(v) => set("ratioH", v)} />
        </div>
      )}
      {o.style === "fixed" && (
        <div className="ae-grid-2">
          <NumberField label="Width" unit="px" value={o.fixedW} min={1} onChange={(v) => set("fixedW", v)} />
          <NumberField label="Height" unit="px" value={o.fixedH} min={1} onChange={(v) => set("fixedH", v)} />
        </div>
      )}
      {rect && (
        <div className="ae-subsection">
          <span className="ae-field-label">Current selection</span>
          <div className="ae-grid-2">
            <NumberField label="X" unit="px" value={rect.x} onChange={(v) => edit("x", v)} />
            <NumberField label="Y" unit="px" value={rect.y} onChange={(v) => edit("y", v)} />
            <NumberField label="W" unit="px" min={1} value={rect.w} onChange={(v) => edit("w", v)} />
            <NumberField label="H" unit="px" min={1} value={rect.h} onChange={(v) => edit("h", v)} />
          </div>
        </div>
      )}
    </>
  );
}
