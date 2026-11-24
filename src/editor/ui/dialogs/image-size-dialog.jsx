// Scale Image and Canvas Size: a new width and height for the whole image.
// Scaling resamples the pixels; canvas size keeps them and adds or trims
// space on the sides away from the anchor.
import { useState } from "react";
import { resizeCanvas, scaleImage } from "../../commands/image-size-commands.js";
import { fitsLimits, limitsMessage } from "../../engine/limits.js";
import { CheckField } from "../fields/check-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";

export function ImageSizeDialog({ onClose, mode }) {
  const rt = useRuntime();
  const doc = rt.session.doc;
  const scaling = mode === "scale";
  const [size, setSize] = useState({ width: doc.width, height: doc.height });
  const [keepRatio, setKeepRatio] = useState(scaling);
  const [anchor, setAnchor] = useState({ x: 0.5, y: 0.5 });
  const valid = fitsLimits(size.width, size.height);
  const ratio = doc.width / doc.height;

  const set = (key, value) =>
    setSize((s) => {
      if (!keepRatio) return { ...s, [key]: value };
      const other = Math.max(1, Math.round(key === "width" ? value / ratio : value * ratio));
      return key === "width" ? { width: value, height: other } : { width: other, height: value };
    });

  const apply = () => {
    if (!valid) return;
    onClose();
    if (scaling) scaleImage(rt, size.width, size.height);
    else resizeCanvas(rt, size.width, size.height, anchor);
  };

  return (
    <Modal
      title={scaling ? "Scale image" : "Canvas size"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" disabled={!valid} onClick={apply}>{scaling ? "Scale" : "Resize"}</button>
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
        <div className="ae-grid-2">
          <NumberField label="Width" unit="px" min={1} value={size.width} onChange={(v) => set("width", v)} />
          <NumberField label="Height" unit="px" min={1} value={size.height} onChange={(v) => set("height", v)} />
        </div>
        <CheckField label="Keep proportions" checked={keepRatio} onChange={setKeepRatio} />
        {!scaling && (
          <>
            <Segmented label="Keep the image at the" value={anchor.x} onChange={(x) => setAnchor((a) => ({ ...a, x }))} options={[[0, "Left"], [0.5, "Centre"], [1, "Right"]]} />
            <Segmented value={anchor.y} onChange={(y) => setAnchor((a) => ({ ...a, y }))} options={[[0, "Top"], [0.5, "Middle"], [1, "Bottom"]]} />
          </>
        )}
        {!valid && <p className="ae-error">{limitsMessage()}</p>}
        <p className="ae-note">
          {scaling
            ? `Resamples every layer. Now ${doc.width} × ${doc.height} px.`
            : `Adds or trims space around the image without resampling. Now ${doc.width} × ${doc.height} px.`}
        </p>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
