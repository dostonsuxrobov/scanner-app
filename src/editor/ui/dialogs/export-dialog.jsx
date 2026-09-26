// Export: file name, format, quality, background for formats without
// transparency, and output scale.
import { useState } from "react";
import { exportDocument } from "../../commands/file-commands.js";
import { EXPORT_FORMATS } from "../../engine/io/export-image.js";
import { ColorField } from "../fields/color-field.jsx";
import { NumberField } from "../fields/number-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { SliderField } from "../fields/slider-field.jsx";
import { useEditor, useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";

export function ExportDialog({ onClose, then }) {
  const rt = useRuntime();
  const preferences = useEditor((s) => s.preferences);
  const doc = rt.session.doc;
  const [name, setName] = useState(doc.name);
  const [format, setFormat] = useState(preferences.exportFormat in EXPORT_FORMATS ? preferences.exportFormat : "png");
  const [quality, setQuality] = useState(preferences.exportQuality);
  const [background, setBackground] = useState("#ffffff");
  const [scale, setScale] = useState(100);
  const spec = EXPORT_FORMATS[format];
  const outW = Math.max(1, Math.round((doc.width * scale) / 100));
  const outH = Math.max(1, Math.round((doc.height * scale) / 100));

  const run = async () => {
    rt.store.getState().setPreference("exportQuality", quality);
    const ok = await exportDocument(rt, { fileName: name.trim() || doc.name, format, quality: quality / 100, background, scale: scale / 100 });
    if (!ok) return;
    onClose();
    then?.();
  };

  return (
    <Modal
      title="Export image"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" onClick={run}>Export {spec.label}</button>
        </>
      }
    >
      <form
        className="ae-form"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="ae-field">
          <span className="ae-field-label">File name</span>
          <span className="ae-filename">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <span>.{spec.ext}</span>
          </span>
        </label>
        <Segmented label="Format" value={format} onChange={setFormat} options={Object.entries(EXPORT_FORMATS).map(([id, f]) => [id, f.label])} />
        {spec.lossy && <SliderField label="Quality" unit="%" min={10} max={100} value={quality} onChange={setQuality} />}
        {!spec.alpha && <ColorField label="Background (fills transparent areas)" value={background} onChange={setBackground} />}
        {spec.alpha && <p className="ae-note">Transparent areas stay transparent.</p>}
        <div className="ae-grid-2">
          <NumberField label="Scale" unit="%" min={1} max={400} value={scale} onChange={setScale} />
          <div className="ae-field">
            <span className="ae-field-label">Output size</span>
            <span className="ae-readout">{outW} × {outH} px</span>
          </div>
        </div>
        <p className="ae-note">Export saves a flattened copy. Use File › Save project to keep layers editable.</p>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
