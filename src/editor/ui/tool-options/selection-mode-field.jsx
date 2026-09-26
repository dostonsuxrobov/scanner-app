// Replace / Add / Subtract / Intersect, shared by the selection tools.
import { SquareDashed, SquarePlus, SquareMinus, SquareSplitHorizontal } from "lucide-react";
import { Segmented } from "../fields/segmented.jsx";

export const SELECTION_MODES = [
  ["replace", "Replace selection", SquareDashed],
  ["add", "Add to selection (hold Shift)", SquarePlus],
  ["subtract", "Subtract from selection (hold Ctrl)", SquareMinus],
  ["intersect", "Intersect with selection (hold Ctrl+Shift)", SquareSplitHorizontal],
];

export function SelectionModeField({ value, onChange }) {
  return (
    <>
      <Segmented label="Mode" value={value} onChange={onChange} options={SELECTION_MODES} />
      <p className="ae-note">Or hold a key while clicking: Shift adds (+), Ctrl subtracts (−), Ctrl+Shift intersects.</p>
    </>
  );
}
