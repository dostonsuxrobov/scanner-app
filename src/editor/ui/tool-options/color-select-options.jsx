import { CheckField } from "../fields/check-field.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useRuntime } from "../editor-context.js";
import { SelectionModeField } from "./selection-mode-field.jsx";
import { SAMPLE_SIZES } from "./sample-sizes.js";
import { useToolOptions } from "./use-tool-options.js";

// Changes that alter which pixels match re-apply the last click live.
const LIVE = new Set(["threshold", "antialias", "feather"]);

export function ColorSelectOptions() {
  const rt = useRuntime();
  const [o, setRaw] = useToolOptions("bycolor");
  const set = (key, value) => {
    setRaw(key, value);
    if (LIVE.has(key)) rt.tools.bycolor.reapply(rt);
  };
  return (
    <>
      <SelectionModeField value={o.mode} onChange={(v) => set("mode", v)} />
      <SliderField label="Threshold" min={0} max={255} value={o.threshold} onChange={(v) => set("threshold", v)} />
      <SelectField
        label="Compare by"
        value={o.criterion}
        onChange={(v) => set("criterion", v)}
        options={[
          ["rgb", "Composite (RGB)"],
          ["red", "Red"],
          ["green", "Green"],
          ["blue", "Blue"],
          ["alpha", "Alpha"],
          ["brightness", "Brightness"],
        ]}
      />
      <SelectField label="Sample size" value={String(o.sampleSize)} onChange={(v) => set("sampleSize", Number(v))} options={SAMPLE_SIZES} />
      <SliderField label="Feather" unit="px" min={0} max={50} value={o.feather} onChange={(v) => set("feather", v)} />
      <CheckField label="Sample all visible layers" checked={o.sampleMerged} onChange={(v) => set("sampleMerged", v)} />
      <CheckField label="Select transparent areas" checked={o.transparent} onChange={(v) => set("transparent", v)} />
      <CheckField label="Smooth edges (antialias)" checked={o.antialias} onChange={(v) => set("antialias", v)} />
      <p className="ae-note">Selects matching color everywhere in the image, including areas that don't touch.</p>
    </>
  );
}
