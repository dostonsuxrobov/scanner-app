// Reference of keyboard and pointer shortcuts.
import { COMMANDS, TOOL_KEYS } from "../../keymap/keymap.js";
import { formatCombo } from "../../keymap/combo.js";
import { toolInfo } from "../tool-catalog.js";
import { Modal } from "./modal.jsx";

const NAMES = {
  new: "New image", open: "Open", openAsLayers: "Open as layers", save: "Save project", export: "Export image", close: "Close image",
  undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste", clear: "Delete pixels", fillFg: "Fill with foreground",
  fillBg: "Fill with background", selectAll: "Select all", selectNone: "Deselect", invertSelection: "Invert selection",
  adjustColors: "Adjust colors", desaturate: "Desaturate", invertColors: "Invert colors", newLayer: "New layer",
  duplicateLayer: "Duplicate layer", raiseLayer: "Bring layer forward", lowerLayer: "Send layer backward", mergeDown: "Merge down",
  transform: "Transform", zoomIn: "Zoom in", zoomOut: "Zoom out", fit: "Fit in window", actualPixels: "Actual pixels",
};

const NAVIGATION = [
  ["Scroll wheel", "Zoom at the pointer (switch in View menu)"],
  ["Shift / Alt + wheel", "Pan sideways / up and down"],
  ["Space + drag, middle-drag", "Pan"],
  ["Pinch (touch or trackpad)", "Zoom"],
  ["[  ]", "Brush size"],
  ["Shift + [  ]", "Brush hardness"],
  ["X / D", "Swap colors / black and white"],
  ["Arrow keys", "Nudge (Move tool); Shift = 10 px"],
  ["Enter / Esc", "Apply / cancel transform and crop"],
];

export function ShortcutsDialog({ onClose }) {
  return (
    <Modal wide title="Keyboard shortcuts" onClose={onClose}>
      <div className="ae-shortcuts">
        <section>
          <h3>Tools</h3>
          <dl>
            {TOOL_KEYS.map(([key, id]) => (
              <div key={key}>
                <dt>{toolInfo(id).label}</dt>
                <dd><kbd>{formatCombo(key)}</kbd></dd>
              </div>
            ))}
          </dl>
          <h3>Navigation & painting</h3>
          <dl>
            {NAVIGATION.map(([key, what]) => (
              <div key={key}>
                <dt>{what}</dt>
                <dd><kbd>{key}</kbd></dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Commands</h3>
          <dl>
            {Object.entries(NAMES)
              .filter(([id]) => COMMANDS[id]?.keys.length)
              .map(([id, name]) => (
                <div key={id}>
                  <dt>{name}</dt>
                  <dd><kbd>{formatCombo(COMMANDS[id].keys[0])}</kbd></dd>
                </div>
              ))}
          </dl>
        </section>
      </div>
    </Modal>
  );
}
