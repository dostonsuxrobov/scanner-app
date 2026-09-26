// Global keyboard handling while the editor is visible: tool keys first
// (Enter/Esc/arrows), then commands, tool letters, colors, and brush size.
import { useEffect } from "react";
import { COMMANDS, TOOL_KEYS } from "../keymap/keymap.js";
import { matchesCombo } from "../keymap/combo.js";
import { selectNone } from "../commands/select-commands.js";

const typingInto = (target) =>
  /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;

function adjustBrush(rt, event) {
  const tool = rt.store.getState().tool;
  const options = rt.options(tool);
  if (!options || options.size == null) return false;
  const up = event.code === "BracketRight";
  if (event.shiftKey && options.hardness != null) {
    rt.store.getState().setOption(tool, "hardness", Math.max(0, Math.min(100, options.hardness + (up ? 25 : -25))));
  } else {
    const step = options.size < 10 ? 1 : options.size < 50 ? 5 : options.size < 200 ? 10 : 25;
    rt.store.getState().setOption(tool, "size", Math.max(1, Math.min(1000, options.size + (up ? step : -step))));
  }
  rt.redrawOverlay();
  return true;
}

export function useKeyboardShortcuts(rt, active) {
  useEffect(() => {
    if (!active) return undefined;
    const setSpace = (down) => {
      rt.keys.space = down;
      document.querySelector(".ae-canvas-input")?.dispatchEvent(new Event("editor-space"));
    };

    function onKeyDown(event) {
      if (rt.store.getState().dialog || typingInto(event.target)) return;
      if (event.key === " " && !event.repeat) {
        setSpace(true);
        event.preventDefault();
        return;
      }
      if (rt.session.hasDocument && rt.tool?.key?.(rt, event)) {
        event.preventDefault();
        return;
      }
      for (const command of Object.values(COMMANDS)) {
        if (!command.keys.some((combo) => matchesCombo(combo, event))) continue;
        if (command.native) return; // handled by the paste event, which can read system images
        event.preventDefault();
        command.run(rt);
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      if ((event.code === "BracketLeft" || event.code === "BracketRight") && !event.altKey) {
        if (adjustBrush(rt, event)) event.preventDefault();
        return;
      }
      if (event.altKey) return;
      if (event.key.toLowerCase() === "x") return rt.store.getState().swapColors();
      if (event.key.toLowerCase() === "d") return rt.store.getState().resetColors();
      if (event.key === "Escape" && rt.session.hasDocument) return selectNone(rt);
      const tool = TOOL_KEYS.find(([combo]) => matchesCombo(combo, event));
      if (tool) {
        event.preventDefault();
        rt.setTool(tool[1]);
      }
    }
    const onKeyUp = (event) => event.key === " " && setSpace(false);
    const onBlur = () => setSpace(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [rt, active]);
}
