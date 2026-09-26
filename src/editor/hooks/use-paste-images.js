// Ctrl/⌘+V: pastes the editor's own copied pixels in place, or an image from
// the system clipboard (e.g. a screenshot) as a new layer.
import { useEffect } from "react";
import { paste, pasteImageFile } from "../commands/edit-commands.js";
import { loadImageFromBlob } from "../engine/canvas.js";

// Our own copies are also written to the system clipboard; a matching size
// means the system image is that copy, so paste it in place instead.
async function isOwnCopy(rt, file) {
  const own = rt.session.clipboard;
  if (!own) return false;
  try {
    const image = await loadImageFromBlob(file);
    return image.width === own.canvas.width && image.height === own.canvas.height;
  } catch {
    return false;
  }
}

export function usePasteImages(rt, active) {
  useEffect(() => {
    if (!active) return undefined;
    async function onPaste(event) {
      if (/^(INPUT|TEXTAREA)$/.test(event.target.tagName) || rt.store.getState().dialog || !rt.session.hasDocument) return;
      event.preventDefault();
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file && !(await isOwnCopy(rt, file))) pasteImageFile(rt, file);
      else if (rt.session.clipboard) paste(rt);
      else rt.toast("The clipboard has no image.", true);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [rt, active]);
}
