// Blocks input with a message while a long task (opening, exporting) runs.
import { Loader2 } from "lucide-react";
import { useEditor } from "./editor-context.js";

export function BusyOverlay() {
  const busy = useEditor((s) => s.busy);
  if (!busy) return null;
  return (
    <div className="ae-busy" role="status" aria-live="polite">
      <Loader2 size={18} className="ae-spin" /> {busy}
    </div>
  );
}
