// Replace / Add / Subtract / Intersect, shared by the selection tools.
import { SquareDashed, SquarePlus, SquareMinus, SquareSplitHorizontal } from "lucide-react";
import { Segmented } from "../fields/segmented.jsx";

export const SELECTION_MODES = [
  ["replace", "Replace selection", SquareDashed],
  ["add", "Add to selection (Shift)", SquarePlus],
  ["subtract", "Subtract from selection (Alt)", SquareMinus],
  ["intersect", "Intersect with selection (Shift+Alt)", SquareSplitHorizontal],
];

export function SelectionModeField({ value, onChange }) {
  return <Segmented label="Mode" value={value} onChange={onChange} options={SELECTION_MODES} />;
}
