// Reads one tool's options and returns a setter for a single option.
import { useEditor } from "../editor-context.js";

export function useToolOptions(tool) {
  const options = useEditor((s) => s.options[tool]);
  const setOption = useEditor((s) => s.setOption);
  return [options, (key, value) => setOption(tool, key, value)];
}
