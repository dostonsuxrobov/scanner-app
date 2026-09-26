// Start screen shown when no image is open.
import { FilePlus2, FolderOpen, Layers } from "lucide-react";
import { openScannerPage } from "../commands/file-commands.js";
import { useScannerStore } from "../../store/scanner-store";
import { useRuntime } from "./editor-context.js";

export function WelcomeScreen() {
  const rt = useRuntime();
  const pages = useScannerStore((s) => s.pages);
  return (
    <div className="ae-welcome">
      <div className="ae-welcome-card">
        <div className="ae-welcome-icon">
          <Layers size={26} strokeWidth={1.4} />
        </div>
        <h2>Open an image to start editing</h2>
        <p>Images (PNG, JPEG, WebP, GIF…), PDF pages, and saved projects. You can also drop files here or paste a screenshot.</p>
        <div className="ae-welcome-actions">
          <button type="button" className="ae-button ae-primary" onClick={() => rt.openFilePicker(false)}>
            <FolderOpen size={16} /> Open file…
          </button>
          <button type="button" className="ae-button" onClick={() => rt.store.getState().openDialog("new")}>
            <FilePlus2 size={16} /> New blank image
          </button>
        </div>
        {pages.length > 0 && (
          <div className="ae-welcome-pages">
            <h3>From your Simple pages</h3>
            <ul>
              {pages.map((page) => (
                <li key={page.id}>
                  <button type="button" onClick={() => openScannerPage(rt, page)} title={`Open ${page.name}`}>
                    <img src={page.src} alt="" />
                    <span>{page.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
