// Gaussian blur with a live preview.
import { useMemo, useState } from "react";
import { applyLayerOperation, blurOperation } from "../../commands/image-commands.js";
import { CheckField } from "../fields/check-field.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";
import { useLivePreview } from "./use-live-preview.js";

export function BlurDialog({ onClose }) {
  const rt = useRuntime();
  const [radius, setRadius] = useState(4);
  const [preview, setPreview] = useState(true);
  const operation = useMemo(() => (radius > 0 ? blurOperation(radius) : null), [radius]);
  useLivePreview(rt, operation, preview);
  const apply = () => {
    onClose();
    if (operation) applyLayerOperation(rt, "Gaussian blur", operation);
  };
  return (
    <Modal
      title="Gaussian blur"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" onClick={apply}>Apply</button>
        </>
      }
    >
      <div className="ae-form">
        <SliderField label="Radius" unit="px" min={0} max={100} step={0.5} value={radius} onChange={setRadius} />
        <CheckField label="Preview" checked={preview} onChange={setPreview} />
      </div>
    </Modal>
  );
}
