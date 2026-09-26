import { Copy } from "lucide-react";
import { hexToRgb } from "../../engine/color.js";
import { CheckField } from "../fields/check-field.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { useEditor, useRuntime } from "../editor-context.js";
import { SAMPLE_SIZES } from "./sample-sizes.js";
import { useToolOptions } from "./use-tool-options.js";

export function EyedropperOptions() {
  const rt = useRuntime();
  const [o, set] = useToolOptions("eyedropper");
  const colors = useEditor((s) => s.colors);
  const copyHex = (hex) => navigator.clipboard?.writeText(hex).then(() => rt.toast(`Copied ${hex}`), () => {});
  return (
    <>
      <SelectField label="Sample size" value={String(o.sampleSize)} onChange={(v) => set("sampleSize", Number(v))} options={SAMPLE_SIZES} />
      <CheckField label="Sample all visible layers" checked={o.sampleMerged} onChange={(v) => set("sampleMerged", v)} />
      {["fg", "bg"].map((which) => (
        <div key={which} className="ae-color-readout">
          <i style={{ background: colors[which] }} />
          <span>
            <strong>{which === "fg" ? "Foreground" : "Background"}</strong>
            {colors[which]} · rgb({hexToRgb(colors[which]).join(", ")})
          </span>
          <button type="button" className="ae-icon-button" aria-label={`Copy ${colors[which]}`} title="Copy hex" onClick={() => copyHex(colors[which])}>
            <Copy size={13} />
          </button>
        </div>
      ))}
      <p className="ae-note">Click or drag to pick the foreground · Alt-click picks the background.</p>
    </>
  );
}
