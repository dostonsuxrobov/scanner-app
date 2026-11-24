// Asks by how many pixels to feather, grow, or shrink the selection.
import { useState } from "react";
import { changeSelection } from "../../commands/select-commands.js";
import { NumberField } from "../fields/number-field.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";

const ACTIONS = {
  feather: { title: "Feather selection", label: "Soften the edge over", start: 5 },
  grow: { title: "Grow selection", label: "Grow by", start: 1 },
  shrink: { title: "Shrink selection", label: "Shrink by", start: 1 },
};

export function SelectionAmountDialog({ onClose, action }) {
  const rt = useRuntime();
  const { title, label, start } = ACTIONS[action];
  const [amount, setAmount] = useState(start);
  const apply = () => {
    onClose();
    changeSelection(rt, action, amount);
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" onClick={apply}>Apply</button>
        </>
      }
    >
      <form
        className="ae-form"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <NumberField label={label} unit="px" min={1} max={500} value={amount} onChange={setAmount} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
