import { SliderField } from "../fields/slider-field.jsx";
import { useToolOptions } from "./use-tool-options.js";

export function BucketOptions() {
  const [o, set] = useToolOptions("bucket");
  return (
    <>
      <SliderField label="Threshold" min={0} max={255} value={o.threshold} onChange={(v) => set("threshold", v)} />
      <p className="ae-note">Click to fill the connected area of similar color with the foreground color. A selection limits the fill.</p>
    </>
  );
}
