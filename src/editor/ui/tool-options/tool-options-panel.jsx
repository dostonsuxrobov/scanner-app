// Shows the options of the active tool.
import { useEditor } from "../editor-context.js";
import { toolInfo } from "../tool-catalog.js";
import { formatCombo } from "../../keymap/combo.js";
import { MoveOptions } from "./move-options.jsx";
import { RectSelectOptions } from "./rect-select-options.jsx";
import { TransformOptions } from "./transform-options.jsx";
import { ColorSelectOptions } from "./color-select-options.jsx";
import { PaintOptions } from "./paint-options.jsx";
import { TextOptions } from "./text-options.jsx";
import { ShapeOptions } from "./shape-options.jsx";
import { EyedropperOptions } from "./eyedropper-options.jsx";
import { CropOptions } from "./crop-options.jsx";

const PANELS = {
  move: () => <MoveOptions />,
  select: () => <RectSelectOptions />,
  scale: () => <TransformOptions />,
  bycolor: () => <ColorSelectOptions />,
  brush: () => <PaintOptions tool="brush" />,
  eraser: () => <PaintOptions tool="eraser" />,
  text: () => <TextOptions />,
  rectangle: () => <ShapeOptions tool="rectangle" />,
  ellipse: () => <ShapeOptions tool="ellipse" />,
  eyedropper: () => <EyedropperOptions />,
  crop: () => <CropOptions />,
};

export function ToolOptionsPanel() {
  const tool = useEditor((s) => s.tool);
  const info = toolInfo(tool);
  return (
    <section className="ae-panel" aria-labelledby="ae-tool-options-title">
      <header className="ae-panel-head">
        <h2 id="ae-tool-options-title">{info.label}</h2>
        <kbd>{formatCombo(info.key)}</kbd>
      </header>
      <div className="ae-panel-body ae-tool-options">{PANELS[tool]()}</div>
    </section>
  );
}
