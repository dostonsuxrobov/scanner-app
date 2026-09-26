// Renders the open dialog, if any.
import { useEditor } from "../editor-context.js";
import { AdjustColorsDialog } from "./adjust-colors-dialog.jsx";
import { BlurDialog } from "./blur-dialog.jsx";
import { ExportDialog } from "./export-dialog.jsx";
import { NewImageDialog } from "./new-image-dialog.jsx";
import { PdfImportDialog } from "./pdf-import-dialog.jsx";
import { ShortcutsDialog } from "./shortcuts-dialog.jsx";
import { UnsavedDialog } from "./unsaved-dialog.jsx";

const DIALOGS = {
  new: NewImageDialog,
  export: ExportDialog,
  unsaved: UnsavedDialog,
  pdf: PdfImportDialog,
  adjust: AdjustColorsDialog,
  blur: BlurDialog,
  shortcuts: ShortcutsDialog,
};

export function DialogHost() {
  const dialog = useEditor((s) => s.dialog);
  const close = useEditor((s) => s.closeDialog);
  if (!dialog) return null;
  const { type, ...props } = dialog;
  const Dialog = DIALOGS[type];
  return Dialog ? <Dialog key={type} {...props} onClose={close} /> : null;
}
