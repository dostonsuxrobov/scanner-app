// Text style controls. They edit the text being typed, otherwise the active
// text layer, otherwise the style used for the next text.
import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { isTextLayer } from "../../engine/layer.js";
import { FONT_GROUPS, WEIGHT_NAMES, fontInfo, localFontFamilies, nearestWeight } from "../../engine/text/font-catalog.js";
import { canListLocalFonts, ensureFont, listLocalFonts } from "../../engine/text/font-loader.js";
import { ColorField } from "../fields/color-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { useEditor, useRuntime, useSessionVersion } from "../editor-context.js";

export function TextOptions() {
  const rt = useRuntime();
  useSessionVersion();
  const edit = useEditor((s) => s.textEdit);
  const defaults = useEditor((s) => s.options.text);
  const setOptions = useEditor((s) => s.setOptions);
  const [localCount, setLocalCount] = useState(localFontFamilies().length);
  const layer = rt.session.activeLayer;
  const target = edit ? "editing" : isTextLayer(layer) ? "layer" : "defaults";
  const style = edit ? edit.text.style : target === "layer" ? layer.text.style : defaults;

  const apply = (patch) => {
    const next = { ...style, ...patch };
    if (patch.family) next.weight = nearestWeight(patch.family, next.weight);
    const changed = { ...patch, weight: next.weight };
    ensureFont(next).then(() => rt.redrawOverlay());
    setOptions("text", changed); // new text starts with the last used style
    if (target !== "defaults") rt.tools.text.setStyle(rt, changed);
  };

  const families = [
    ...FONT_GROUPS.map((g) => ({ label: g.label, options: g.fonts.map((f) => [f.family, f.family]) })),
    ...(localCount ? [{ label: "Installed on this computer", options: localFontFamilies().map((f) => [f.family, f.family]) }] : []),
  ];
  const weights = fontInfo(style.family).weights;
  const toggle = (key) => apply({ [key]: !style[key] });

  return (
    <>
      <p className="ae-note ae-note-top">
        {target === "editing" ? "Editing text on the canvas." : target === "layer" ? `Styling “${layer.name}”.` : "Click the canvas to type, or drag to make a text box."}
      </p>
      <SelectField label="Font" value={style.family} onChange={(family) => apply({ family })} options={families} />
      {canListLocalFonts() && !localCount && (
        <button
          type="button"
          className="ae-link"
          onClick={() =>
            listLocalFonts().then((list) => setLocalCount(list.length), () => rt.toast("Access to installed fonts was not granted.", true))
          }
        >
          Show fonts installed on this computer
        </button>
      )}
      <div className="ae-grid-2">
        <SelectField label="Weight" value={String(style.weight)} onChange={(v) => apply({ weight: Number(v) })} options={weights.map((w) => [String(w), `${WEIGHT_NAMES[w]} ${w}`])} />
        <NumberField label="Size" unit="px" min={1} max={2000} value={style.size} onChange={(size) => apply({ size })} />
        <NumberField label="Line height" min={0.5} max={5} step={0.05} decimals={2} value={style.lineHeight} onChange={(lineHeight) => apply({ lineHeight })} />
        <NumberField label="Tracking" unit="px" min={-50} max={200} decimals={1} value={style.letterSpacing} onChange={(letterSpacing) => apply({ letterSpacing })} />
      </div>
      <div className="ae-field">
        <span className="ae-field-label">Style</span>
        <div className="ae-segmented ae-segmented-actions">
          <button type="button" aria-label="Bold" title="Bold" aria-pressed={style.weight >= 600} onClick={() => apply({ weight: nearestWeight(style.family, style.weight >= 600 ? 400 : 700) })}><Bold size={15} /></button>
          <button type="button" aria-label="Italic" title="Italic" aria-pressed={style.italic} onClick={() => toggle("italic")}><Italic size={15} /></button>
          <button type="button" aria-label="Underline" title="Underline" aria-pressed={style.underline} onClick={() => toggle("underline")}><Underline size={15} /></button>
          <button type="button" aria-label="Strikethrough" title="Strikethrough" aria-pressed={style.strike} onClick={() => toggle("strike")}><Strikethrough size={15} /></button>
        </div>
      </div>
      <Segmented
        label="Alignment"
        value={style.align}
        onChange={(align) => apply({ align })}
        options={[
          ["left", "Align left", AlignLeft],
          ["center", "Centre", AlignCenter],
          ["right", "Align right", AlignRight],
        ]}
      />
      <ColorField label="Color" value={style.color} onChange={(color) => apply({ color })} />
      <div className="ae-grid-2">
        <NumberField label="Outline" unit="px" min={0} max={100} decimals={1} value={style.strokeWidth} onChange={(strokeWidth) => apply({ strokeWidth })} />
        <ColorField label="Outline color" value={style.strokeColor} onChange={(strokeColor) => apply({ strokeColor })} />
      </div>
      <p className="ae-note">Ctrl+Enter or click elsewhere to finish · Esc cancels. Painting on a text layer converts it to pixels.</p>
    </>
  );
}
