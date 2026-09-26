// New image: size presets, custom size, and background.
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { guardUnsaved, newImage } from "../../commands/document-commands.js";
import { fitsLimits, limitsMessage } from "../../engine/limits.js";
import { NumberField } from "../fields/number-field.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { Segmented } from "../fields/segmented.jsx";
import { useEditor, useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";

const PRESETS = [
  ["custom", "Custom", 0, 0],
  ["a4", "A4 at 300 ppi", 2480, 3508],
  ["letter", "US Letter at 300 ppi", 2550, 3300],
  ["hd", "Full HD 1920 × 1080", 1920, 1080],
  ["4k", "4K 3840 × 2160", 3840, 2160],
  ["square", "Square 1080 × 1080", 1080, 1080],
  ["portrait", "Social portrait 1080 × 1350", 1080, 1350],
  ["story", "Story 1080 × 1920", 1080, 1920],
];

export function NewImageDialog({ onClose }) {
  const rt = useRuntime();
  const colors = useEditor((s) => s.colors);
  const [size, setSize] = useState({ width: 1920, height: 1080 });
  const [preset, setPreset] = useState("hd");
  const [background, setBackground] = useState("white");
  const [name, setName] = useState("Untitled");
  const valid = fitsLimits(size.width, size.height);
  const fill = { transparent: "transparent", white: "#ffffff", fg: colors.fg, bg: colors.bg }[background];

  const resize = (patch) => {
    setSize((s) => ({ ...s, ...patch }));
    setPreset("custom");
  };

  const create = () => {
    if (!valid) return;
    onClose();
    guardUnsaved(rt, () => newImage(rt, { ...size, background: fill, name: name.trim() || "Untitled" }), "create a new image");
  };

  return (
    <Modal
      title="New image"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" disabled={!valid} onClick={create}>Create</button>
        </>
      }
    >
      <form
        className="ae-form"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <label className="ae-field">
          <span className="ae-field-label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <SelectField
          label="Preset"
          value={preset}
          onChange={(id) => {
            setPreset(id);
            const p = PRESETS.find((x) => x[0] === id);
            if (p[2]) setSize({ width: p[2], height: p[3] });
          }}
          options={PRESETS.map(([id, label]) => [id, label])}
        />
        <div className="ae-grid-3">
          <NumberField label="Width" unit="px" min={1} value={size.width} onChange={(width) => resize({ width })} />
          <button type="button" className="ae-icon-button ae-swap" title="Swap width and height" aria-label="Swap width and height" onClick={() => setSize((s) => ({ width: s.height, height: s.width }))}>
            <ArrowLeftRight size={14} />
          </button>
          <NumberField label="Height" unit="px" min={1} value={size.height} onChange={(height) => resize({ height })} />
        </div>
        {!valid && <p className="ae-error">{limitsMessage()}</p>}
        <Segmented
          label="Background"
          value={background}
          onChange={setBackground}
          options={[
            ["transparent", "Transparent"],
            ["white", "White"],
            ["fg", "Foreground"],
            ["bg", "Background"],
          ]}
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
