import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from "lucide-react";
import { normalizeAngle } from "../../engine/transform/transform-draft.js";
import { CheckField } from "../fields/check-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { useEditor, useRuntime } from "../editor-context.js";
import { useToolOptions } from "./use-tool-options.js";

export function TransformOptions() {
  const rt = useRuntime();
  const draft = useEditor((s) => s.transform);
  const [o, set] = useToolOptions("scale");
  const tool = rt.tools.scale;
  if (!draft)
    return (
      <>
        <p className="ae-note">Transforms the active layer, or only the selected pixels when there is a selection.</p>
        <button type="button" className="ae-button ae-wide" onClick={() => tool.begin(rt)}>
          Start transform
        </button>
      </>
    );
  const update = (patch) => tool.update(rt, { ...draft, ...patch });
  const resize = (key, value) => {
    const other = key === "w" ? "h" : "w";
    const patch = { [key]: Math.max(1, value) };
    if (o.keepAspect) patch[other] = Math.max(1, (value * draft[other]) / draft[key]);
    update(patch);
  };
  const percent = (key) => Math.round((draft[key] / (key === "w" ? draft.sourceW : draft.sourceH)) * 1000) / 10;
  return (
    <>
      <div className="ae-grid-2">
        <NumberField label="W" unit="px" min={1} value={Math.round(draft.w)} onChange={(v) => resize("w", v)} />
        <NumberField label="H" unit="px" min={1} value={Math.round(draft.h)} onChange={(v) => resize("h", v)} />
        <NumberField label="W" unit="%" min={0.1} decimals={1} value={percent("w")} onChange={(v) => resize("w", (v / 100) * draft.sourceW)} />
        <NumberField label="H" unit="%" min={0.1} decimals={1} value={percent("h")} onChange={(v) => resize("h", (v / 100) * draft.sourceH)} />
        <NumberField label="X" unit="px" value={Math.round(draft.cx - draft.w / 2)} onChange={(v) => update({ cx: v + draft.w / 2 })} />
        <NumberField label="Y" unit="px" value={Math.round(draft.cy - draft.h / 2)} onChange={(v) => update({ cy: v + draft.h / 2 })} />
      </div>
      <CheckField label="Keep proportions (Shift toggles)" checked={o.keepAspect} onChange={(v) => set("keepAspect", v)} />
      <NumberField label="Angle" unit="°" decimals={1} min={-180} max={180} value={draft.angle} onChange={(v) => update({ angle: normalizeAngle(v) })} />
      <div className="ae-segmented ae-segmented-actions">
        <button type="button" title="Rotate 90° left" aria-label="Rotate 90° left" onClick={() => update({ angle: normalizeAngle(draft.angle - 90) })}><RotateCcw size={15} /></button>
        <button type="button" title="Rotate 90° right" aria-label="Rotate 90° right" onClick={() => update({ angle: normalizeAngle(draft.angle + 90) })}><RotateCw size={15} /></button>
        <button type="button" title="Flip horizontally" aria-label="Flip horizontally" aria-pressed={draft.flipX} onClick={() => update({ flipX: !draft.flipX })}><FlipHorizontal2 size={15} /></button>
        <button type="button" title="Flip vertically" aria-label="Flip vertically" aria-pressed={draft.flipY} onClick={() => update({ flipY: !draft.flipY })}><FlipVertical2 size={15} /></button>
      </div>
      <SelectField
        label="Interpolation"
        value={o.smoothing ? "smooth" : "nearest"}
        onChange={(v) => {
          set("smoothing", v === "smooth");
          tool.update(rt, { ...draft });
        }}
        options={[
          ["smooth", "Smooth (photos)"],
          ["nearest", "Nearest neighbour (pixel art)"],
        ]}
      />
      <div className="ae-actions">
        <button type="button" className="ae-button" onClick={() => tool.discard(rt)}>Cancel</button>
        <button type="button" className="ae-button ae-primary" onClick={() => tool.apply(rt)}>Apply</button>
      </div>
      <p className="ae-note">Enter applies · Esc cancels · Drag outside the box to rotate (Shift snaps to 15°).</p>
    </>
  );
}
