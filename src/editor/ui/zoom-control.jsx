// Zoom out / editable percentage with presets / zoom in / fit.
import { useEffect, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { actualPixels, fitToScreen, zoomStep, zoomTo } from "../commands/view-commands.js";
import { formatZoom } from "../engine/view/viewport.js";
import { useRuntime, useView } from "./editor-context.js";

const PRESETS = [0.125, 0.25, 0.5, 0.6667, 1, 1.5, 2, 3, 4, 8, 16];

export function ZoomControl({ disabled }) {
  const rt = useRuntime();
  const zoom = useView((s) => s.zoom);
  const [text, setText] = useState(formatZoom(zoom));
  useEffect(() => setText(formatZoom(zoom)), [zoom]);
  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n) && n > 0) zoomTo(rt, n / 100);
    else setText(formatZoom(zoom));
  };
  return (
    <div className="ae-zoom" aria-label="Zoom">
      <button type="button" className="ae-icon-button" aria-label="Zoom out" title="Zoom out (Ctrl −)" disabled={disabled} onClick={() => zoomStep(rt, -1)}>
        <Minus size={14} />
      </button>
      <input
        aria-label="Zoom level"
        list="ae-zoom-presets"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <datalist id="ae-zoom-presets">
        {PRESETS.map((z) => (
          <option key={z} value={formatZoom(z)} />
        ))}
      </datalist>
      <button type="button" className="ae-icon-button" aria-label="Zoom in" title="Zoom in (Ctrl +)" disabled={disabled} onClick={() => zoomStep(rt, 1)}>
        <Plus size={14} />
      </button>
      <button type="button" className="ae-text-button" disabled={disabled} onClick={() => fitToScreen(rt)} title="Fit in window (Ctrl 0)">
        <Maximize size={13} /> Fit
      </button>
      <button type="button" className="ae-text-button" disabled={disabled} onClick={() => actualPixels(rt)} title="Actual pixels (Ctrl 1)">
        100%
      </button>
    </div>
  );
}
