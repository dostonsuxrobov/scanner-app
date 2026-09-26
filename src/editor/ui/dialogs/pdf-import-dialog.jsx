// Import from PDF: pick pages and resolution. Several pages open as layers.
import { useEffect, useState } from "react";
import { openPdfPages } from "../../commands/file-commands.js";
import { baseName } from "../../engine/io/file-kind.js";
import { fitWithinLimits } from "../../engine/io/fit-limits.js";
import { Segmented } from "../fields/segmented.jsx";
import { SelectField } from "../fields/select-field.jsx";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";
import { usePdfDocument } from "./use-pdf-document.js";

const RESOLUTIONS = [
  ["72", "72 ppi — screen"],
  ["150", "150 ppi — default"],
  ["200", "200 ppi"],
  ["300", "300 ppi — print quality"],
  ["600", "600 ppi — maximum detail"],
];

export function PdfImportDialog({ onClose, file, asLayers }) {
  const rt = useRuntime();
  const { pdf, thumbs, error } = usePdfDocument(file);
  const [selected, setSelected] = useState(new Set([1]));
  const [dpi, setDpi] = useState("150");
  const [background, setBackground] = useState("white");
  const [size, setSize] = useState(null);
  const [progress, setProgress] = useState(null);
  const first = Math.min(...selected);

  useEffect(() => {
    if (!pdf || !Number.isFinite(first)) return;
    pdf.pageSize(first).then((s) => setSize(fitWithinLimits(Math.round((s.width * dpi) / 72), Math.round((s.height * dpi) / 72))));
  }, [pdf, first, dpi]);

  const toggle = (n, extend) =>
    setSelected((current) => {
      const next = new Set(extend ? current : []);
      if (extend && next.has(n) && next.size > 1) next.delete(n);
      else next.add(n);
      return next;
    });

  // The PDF stays open while this dialog is mounted, so render before closing.
  const importPages = async () => {
    const numbers = [...selected].sort((a, b) => a - b);
    const pages = [];
    try {
      for (const [i, number] of numbers.entries()) {
        setProgress(`Rendering page ${number} (${i + 1} of ${numbers.length})…`);
        const { canvas, scaled } = await pdf.render(number, Number(dpi), background === "white" ? "#ffffff" : null);
        pages.push({ number, canvas, scaled });
      }
    } catch (e) {
      setProgress(null);
      return rt.toast(`The PDF page could not be rendered: ${e.message}`, true);
    }
    onClose();
    openPdfPages(rt, pages, { asLayers, name: baseName(file.name) });
  };

  const count = pdf?.pageCount ?? 0;
  return (
    <Modal
      wide
      title={`Import “${file.name}”`}
      onClose={onClose}
      footer={
        <>
          {count > 1 && (
            <>
              <button type="button" className="ae-button" onClick={() => setSelected(new Set(Array.from({ length: count }, (_, i) => i + 1)))}>Select all</button>
              <span className="ae-spacer" />
            </>
          )}
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button type="button" className="ae-button ae-primary" disabled={!pdf || !selected.size || !!progress} onClick={importPages}>
            {progress ?? (selected.size > 1 ? `Open ${selected.size} pages as layers` : `Open page ${first}`)}
          </button>
        </>
      }
    >
      {error ? (
        <p className="ae-error">{error}</p>
      ) : !pdf ? (
        <p className="ae-note">Reading PDF…</p>
      ) : (
        <div className="ae-pdf">
          <div className="ae-pdf-settings">
            <p className="ae-note">
              {count} page{count > 1 ? "s" : ""}. Click to choose a page; Ctrl/Shift-click to choose several.
            </p>
            <SelectField label="Resolution" value={dpi} onChange={setDpi} options={RESOLUTIONS} />
            {size && (
              <p className="ae-readout">
                {size.width} × {size.height} px{size.scaled ? " (reduced to fit the editor's limit)" : ""}
              </p>
            )}
            <Segmented
              label="Page background"
              value={background}
              onChange={setBackground}
              options={[
                ["white", "White"],
                ["transparent", "Transparent"],
              ]}
            />
          </div>
          <ul className="ae-pdf-pages" aria-label="Pages">
            {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button type="button" aria-pressed={selected.has(n)} onClick={(e) => toggle(n, e.ctrlKey || e.metaKey || e.shiftKey)}>
                  {thumbs[n] ? <img src={thumbs[n]} alt="" /> : <span className="ae-pdf-placeholder" />}
                  <span>Page {n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
