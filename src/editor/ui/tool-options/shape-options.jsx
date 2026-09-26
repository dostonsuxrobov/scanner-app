import { NumberField } from "../fields/number-field.jsx";
import { CheckField } from "../fields/check-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useEditor } from "../editor-context.js";
import { useToolOptions } from "./use-tool-options.js";

export function ShapeOptions({ tool }) {
  const [o, set] = useToolOptions(tool);
  const colors = useEditor((s) => s.colors);
  return (
    <>
      <Segmented
        label="Style"
        value={o.style}
        onChange={(v) => set("style", v)}
        options={[
          ["fill", "Fill"],
          ["stroke", "Outline"],
          ["both", "Both"],
        ]}
      />
      <div className="ae-legend">
        {o.style !== "stroke" && <span><i style={{ background: colors.fg }} /> Fill: foreground</span>}
        {o.style !== "fill" && <span><i style={{ background: o.style === "both" ? colors.bg : colors.fg }} /> Outline: {o.style === "both" ? "background" : "foreground"}</span>}
      </div>
      {o.style !== "fill" && <NumberField label="Outline width" unit="px" min={1} max={500} value={o.strokeWidth} onChange={(v) => set("strokeWidth", v)} />}
      {tool === "rectangle" && <NumberField label="Corner radius" unit="px" min={0} max={2000} value={o.radius} onChange={(v) => set("radius", v)} />}
      <SliderField label="Opacity" unit="%" min={1} max={100} value={o.opacity} onChange={(v) => set("opacity", v)} />
      <CheckField label="Draw on a new layer" checked={o.newLayer} onChange={(v) => set("newLayer", v)} />
      <p className="ae-note">Shift constrains to a {tool === "ellipse" ? "circle" : "square"} · Alt draws from the centre.</p>
    </>
  );
}
