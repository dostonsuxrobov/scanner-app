// Instantiates every tool. Order here is the order in the toolbox.
import { createMoveTool } from "./move-tool.js";
import { createRectSelectTool } from "./rect-select-tool.js";
import { createTransformTool } from "./transform-tool.js";
import { createColorSelectTool } from "./color-select-tool.js";
import { createPaintTool } from "./paint-tool.js";
import { createTextTool } from "./text-tool.js";
import { createShapeTool } from "./shape-tool.js";
import { createEyedropperTool } from "./eyedropper-tool.js";
import { createCropTool } from "./crop-tool.js";
import { fitToScreen } from "../commands/view-commands.js";

export function createTools() {
  const tools = [
    createMoveTool(),
    createRectSelectTool(),
    createTransformTool(),
    createColorSelectTool(),
    createPaintTool("brush"),
    createPaintTool("eraser"),
    createTextTool(),
    createShapeTool("rectangle"),
    createShapeTool("ellipse"),
    createEyedropperTool(),
    createCropTool({ onCropped: fitToScreen }),
  ];
  return Object.fromEntries(tools.map((tool) => [tool.id, tool]));
}
