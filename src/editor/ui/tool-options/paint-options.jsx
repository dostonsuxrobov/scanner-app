import { SliderField } from "../fields/slider-field.jsx";
import { useToolOptions } from "./use-tool-options.js";

export function PaintOptions({ tool }) {
  const [o, set] = useToolOptions(tool);
  return (
    <>
      <SliderField label="Size" unit="px" min={1} max={1000} value={o.size} onChange={(v) => set("size", v)} />
      <SliderField label="Hardness" unit="%" min={0} max={100} value={o.hardness} onChange={(v) => set("hardness", v)} />
      <SliderField label="Opacity" unit="%" min={1} max={100} value={o.opacity} onChange={(v) => set("opacity", v)} />
      <SliderField label="Smoothing" unit="%" min={0} max={100} value={o.smoothing} onChange={(v) => set("smoothing", v)} />
      <p className="ae-note">
        [ ] size · Shift+[ ] hardness · Shift-click draws a straight line
        {tool === "brush" ? " · Alt-click picks a color" : " · On a transparency-locked layer the eraser paints the background color"}
      </p>
    </>
  );
}
