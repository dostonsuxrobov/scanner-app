// Brightness, contrast, saturation, and hue with a live preview.
import { useMemo, useState } from "react";
import { adjustmentOperation, applyLayerOperation } from "../../commands/image-commands.js";
import { NEUTRAL_ADJUSTMENT, isNeutral } from "../../engine/adjust/color-adjust.js";
import { CheckField } from "../fields/check-field.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";
import { useLivePreview } from "./use-live-preview.js";

export function AdjustColorsDialog({ onClose }) {
  const rt = useRuntime();
  const [values, setValues] = useState(NEUTRAL_ADJUSTMENT);
  const [preview, setPreview] = useState(true);
  const operation = useMemo(() => (isNeutral(values) ? null : adjustmentOperation(values)), [values]);
  useLivePreview(rt, operation, preview);
  const set = (key) => (v) => setValues((s) => ({ ...s, [key]: v }));
  const apply = () => {
    onClose();
    if (operation) applyLayerOperation(rt, "Adjust colors", operation);
  };
  return (
    <Modal
      title="Brightness, contrast & color"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={() => setValues(NEUTRAL_ADJUSTMENT)}>Reset</button>
          <span className="ae-spacer" />
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" onClick={apply}>Apply</button>
        </>
      }
    >
      <div className="ae-form">
        <SliderField label="Brightness" unit="%" min={0} max={200} value={values.brightness} onChange={set("brightness")} />
        <SliderField label="Contrast" unit="%" min={0} max={200} value={values.contrast} onChange={set("contrast")} />
        <SliderField label="Saturation" unit="%" min={0} max={200} value={values.saturation} onChange={set("saturation")} />
        <SliderField label="Hue" unit="°" min={-180} max={180} value={values.hue} onChange={set("hue")} />
        <CheckField label="Preview" checked={preview} onChange={setPreview} />
        <p className="ae-note">Applies to the active layer{rt.session.selection ? ", inside the selection" : ""}.</p>
      </div>
    </Modal>
  );
}
