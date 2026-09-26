// How each tool is presented: icon, name, shortcut, and a one-line hint.
import { Blend, Circle, Crop, Eraser, Move, Paintbrush, Pipette, Scaling, Square, SquareDashed, Type } from "lucide-react";

export const TOOL_CATALOG = [
  { id: "move", icon: Move, label: "Move", key: "V", hint: "Drag to move. Shift locks direction; arrow keys nudge." },
  { id: "select", icon: SquareDashed, label: "Rectangle select", key: "M", hint: "Drag to select. Hold Shift to add (+), Ctrl to subtract (−), Ctrl+Shift to intersect. Drag handles to adjust." },
  { id: "scale", icon: Scaling, label: "Transform (scale, rotate, flip)", key: "Shift+S", hint: "Drag handles to scale, outside to rotate. Enter applies, Esc cancels." },
  { id: "bycolor", icon: Blend, label: "Select by color", key: "Shift+O", hint: "Click a color; drag left/right for threshold. Hold Shift to add (+), Ctrl to subtract (−), Ctrl+Shift to intersect." },
  { id: "brush", icon: Paintbrush, label: "Brush", key: "B", hint: "[ and ] change size. Shift-click draws a straight line; Alt-click picks a color." },
  { id: "eraser", icon: Eraser, label: "Eraser", key: "E", hint: "Erases to transparency. [ and ] change size." },
  { id: "text", icon: Type, label: "Text", key: "T", hint: "Click to type, drag for a text box, click text to edit. Ctrl+Enter commits." },
  { id: "rectangle", icon: Square, label: "Rectangle", key: "U", hint: "Drag to draw. Shift makes a square, Alt draws from the centre." },
  { id: "ellipse", icon: Circle, label: "Ellipse", key: "Shift+U", hint: "Drag to draw. Shift makes a circle, Alt draws from the centre." },
  { id: "eyedropper", icon: Pipette, label: "Color picker", key: "I", hint: "Click to set the foreground color; Alt-click sets the background." },
  { id: "crop", icon: Crop, label: "Crop", key: "C", hint: "Adjust the frame, then press Enter or Crop. Esc resets." },
];

export const toolInfo = (id) => TOOL_CATALOG.find((t) => t.id === id);
