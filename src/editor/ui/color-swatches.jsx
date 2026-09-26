// Foreground/background color swatches with swap and reset.
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { useEditor } from "./editor-context.js";

export function ColorSwatches() {
  const colors = useEditor((s) => s.colors);
  const setColor = useEditor((s) => s.setColor);
  const swap = useEditor((s) => s.swapColors);
  const reset = useEditor((s) => s.resetColors);
  return (
    <div className="ae-swatches">
      <label className="ae-swatch ae-swatch-bg" title="Background color" style={{ background: colors.bg }}>
        <input type="color" aria-label="Background color" value={colors.bg} onChange={(e) => setColor("bg", e.target.value)} />
      </label>
      <label className="ae-swatch ae-swatch-fg" title="Foreground color" style={{ background: colors.fg }}>
        <input type="color" aria-label="Foreground color" value={colors.fg} onChange={(e) => setColor("fg", e.target.value)} />
      </label>
      <button type="button" className="ae-swatch-swap" onClick={swap} title="Swap colors (X)" aria-label="Swap colors">
        <ArrowLeftRight size={11} />
      </button>
      <button type="button" className="ae-swatch-reset" onClick={reset} title="Black and white (D)" aria-label="Reset colors">
        <RotateCcw size={10} />
      </button>
    </div>
  );
}
