// Threshold (black and white) with a live preview.
import { useMemo, useState } from "react";
import { applyLayerOperation, thresholdOperation } from "../../commands/image-commands.js";
import { CheckField } from "../fields/check-field.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";
import { useLivePreview } from "./use-live-preview.js";

export function ThresholdDialog({ onClose }) {
  const rt = useRuntime();
  const [level, setLevel] = useState(128);
  const [preview, setPreview] = useState(true);
  const operation = useMemo(() => thresholdOperation(level), [level]);
  useLivePreview(rt, operation, preview);
  const apply = () => {
    onClose();
    applyLayerOperation(rt, "Threshold", operation);
  };
  return (
    <Modal
      title="Threshold"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" onClick={apply}>Apply</button>
        </>
      }
    >
      <div className="ae-form">
        <SliderField label="Level" min={1} max={255} value={level} onChange={setLevel} />
        <CheckField label="Preview" checked={preview} onChange={setPreview} />
        <p className="ae-note">Pixels at least this bright turn white, the rest black. Applies to the active layer{rt.session.selection ? ", inside the selection" : ""}.</p>
      </div>
    </Modal>
  );
}
