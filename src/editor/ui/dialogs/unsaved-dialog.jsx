// Asked before closing or replacing an image with unsaved changes.
import { saveProject } from "../../commands/file-commands.js";
import { useRuntime } from "../editor-context.js";
import { Modal } from "./modal.jsx";

export function UnsavedDialog({ onClose, verb, onContinue }) {
  const rt = useRuntime();
  const name = rt.session.doc?.name ?? "this image";
  const proceed = () => {
    onClose();
    onContinue();
  };
  return (
    <Modal
      title="Keep your changes?"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ae-button ae-danger" onClick={proceed}>Don't save</button>
          <span className="ae-spacer" />
          <button type="button" className="ae-button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ae-button"
            onClick={() => {
              saveProject(rt);
              proceed();
            }}
          >
            Save project
          </button>
          <button type="button" className="ae-button ae-primary" data-autofocus onClick={() => rt.store.getState().openDialog("export", { then: onContinue })}>
            Export image…
          </button>
        </>
      }
    >
      <p>
        “{name}” has changes that haven't been exported or saved. If you {verb} now, they will be lost.
      </p>
      <p className="ae-note">Export saves a flat image (PNG, JPEG, WebP, PDF). Save project keeps layers and text editable for later.</p>
    </Modal>
  );
}
