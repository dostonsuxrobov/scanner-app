// Shows a layer operation's result while a dialog is open, recomputing at
// most once per frame, and removes the preview when the dialog closes.
import { useEffect, useRef } from "react";
import { endPreview, previewLayerOperation } from "../../commands/image-commands.js";

export function useLivePreview(rt, operation, enabled) {
  const frame = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    if (!enabled || !operation) {
      endPreview(rt);
      return undefined;
    }
    frame.current = requestAnimationFrame(() => previewLayerOperation(rt, operation));
    return () => cancelAnimationFrame(frame.current);
  }, [rt, operation, enabled]);
  useEffect(() => () => endPreview(rt), [rt]);
}
