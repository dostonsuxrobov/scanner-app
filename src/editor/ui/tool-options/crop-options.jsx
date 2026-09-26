import { CheckField } from "../fields/check-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { useEditor, useRuntime } from "../editor-context.js";
import { CROP_RATIOS } from "../../tools/crop-ratios.js";
import { useToolOptions } from "./use-tool-options.js";

export function CropOptions() {
  const rt = useRuntime();
  const [o, set] = useToolOptions("crop");
  const crop = useEditor((s) => s.crop);
  const tool = rt.tools.crop;
  const rect = crop?.rect;
  const edit = (key, value) => {
    rt.store.setState({ crop: { rect: { ...rect, [key]: value } } });
    rt.redrawOverlay();
  };
  const setRatio = (key, value) => {
    set(key, value);
    tool.reset(rt);
  };
  return (
    <>
      <SelectField label="Aspect ratio" value={o.ratio} onChange={(v) => setRatio("ratio", v)} options={CROP_RATIOS} />
      {o.ratio === "custom" && (
        <div className="ae-grid-2">
          <NumberField label="Width" min={0.01} decimals={2} value={o.ratioW} onChange={(v) => setRatio("ratioW", v)} />
          <NumberField label="Height" min={0.01} decimals={2} value={o.ratioH} onChange={(v) => setRatio("ratioH", v)} />
        </div>
      )}
      {rect && (
        <div className="ae-grid-2">
          <NumberField label="X" unit="px" value={Math.round(rect.x)} onChange={(v) => edit("x", v)} />
          <NumberField label="Y" unit="px" value={Math.round(rect.y)} onChange={(v) => edit("y", v)} />
          <NumberField label="W" unit="px" min={1} value={Math.round(rect.w)} onChange={(v) => edit("w", v)} />
          <NumberField label="H" unit="px" min={1} value={Math.round(rect.h)} onChange={(v) => edit("h", v)} />
        </div>
      )}
      <SelectField
        label="Guides"
        value={o.guides}
        onChange={(v) => {
          set("guides", v);
          rt.redrawOverlay();
        }}
        options={[
          ["thirds", "Rule of thirds"],
          ["grid", "Grid"],
          ["none", "None"],
        ]}
      />
      <CheckField label="Delete cropped pixels" checked={o.deletePixels} onChange={(v) => set("deletePixels", v)} title="When off, pixels outside the crop are kept in the layers and can be moved back into view." />
      <div className="ae-actions">
        <button type="button" className="ae-button" onClick={() => tool.reset(rt)}>Reset</button>
        <button type="button" className="ae-button ae-primary" onClick={() => tool.apply(rt)}>Crop</button>
      </div>
      <p className="ae-note">Enter crops · Esc resets · Shift keeps proportions · Drag past the edges to enlarge the canvas.</p>
    </>
  );
}
