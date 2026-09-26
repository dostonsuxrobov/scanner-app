// The menu bar's contents for the current editor state.
import { isTextLayer } from "../../engine/layer.js";
import { openScannerPage } from "../../commands/file-commands.js";

const sep = { separator: true };

export function buildMenus(rt, { pages, preferences }) {
  const { session } = rt;
  const doc = session.doc;
  const has = !!doc;
  const layer = session.activeLayer;
  const index = doc ? doc.layers.indexOf(layer) : -1;
  const selection = session.selection;
  const item = (command, label, props = {}) => ({ command, label, disabled: !has, ...props });

  return [
    {
      label: "File",
      items: [
        item("new", "New image…", { disabled: false }),
        item("open", "Open…", { disabled: false, hint: "Images, PDF, or project" }),
        item("openAsLayers", "Open as layers…"),
        {
          label: "Open from Simple",
          disabled: !pages.length,
          submenu: pages.map((page) => ({ label: page.name, run: () => openScannerPage(rt, page) })),
        },
        sep,
        item("save", "Save project", { hint: "Keeps layers and text editable" }),
        item("export", "Export image…", { hint: "PNG, JPEG, WebP, or PDF" }),
        item("sendToScanner", session.sourceId ? "Update page in Simple" : "Add to Simple pages"),
        sep,
        item("close", "Close image"),
      ],
    },
    {
      label: "Edit",
      items: [
        item("undo", session.history.canUndo ? `Undo ${session.history.undoLabel}` : "Undo", { disabled: !has || !session.history.canUndo }),
        item("redo", session.history.canRedo ? `Redo ${session.history.redoLabel}` : "Redo", { disabled: !has || !session.history.canRedo }),
        sep,
        item("cut", "Cut", { disabled: !layer }),
        item("copy", "Copy", { disabled: !layer }),
        item("paste", "Paste as new layer", { disabled: !has || !session.clipboard }),
        sep,
        item("clear", selection ? "Delete selected pixels" : "Clear layer", { disabled: !layer }),
        item("fillFg", selection ? "Fill selection with foreground" : "Fill layer with foreground", { disabled: !layer }),
        item("fillBg", selection ? "Fill selection with background" : "Fill layer with background", { disabled: !layer }),
      ],
    },
    {
      label: "Select",
      items: [
        item("selectAll", "All"),
        item("selectNone", "None", { disabled: !selection }),
        item("invertSelection", "Invert"),
        sep,
        item("cropToSelection", "Crop to selection", { disabled: !selection?.count }),
      ],
    },
    {
      label: "Image",
      items: [
        item("transform", "Transform layer"),
        { label: "Crop tool", disabled: !has, run: () => rt.setTool("crop"), hint: "C" },
        sep,
        item("adjustColors", "Brightness, contrast, color…", { disabled: !layer }),
        item("desaturate", "Desaturate", { disabled: !layer }),
        item("invertColors", "Invert colors", { disabled: !layer }),
        item("blur", "Gaussian blur…", { disabled: !layer }),
      ],
    },
    {
      label: "Layer",
      items: [
        item("newLayer", "New layer"),
        item("duplicateLayer", "Duplicate layer", { disabled: !layer }),
        item("deleteLayer", "Delete layer", { disabled: !layer || doc.layers.length < 2 }),
        sep,
        item("raiseLayer", "Bring forward", { disabled: !layer || index >= doc.layers.length - 1 }),
        item("lowerLayer", "Send backward", { disabled: !layer || index < 1 }),
        sep,
        item("mergeDown", "Merge down", { disabled: index < 1 }),
        item("flatten", "Flatten image", { disabled: !has || doc.layers.length < 2 }),
        item("rasterizeText", "Rasterize text", { disabled: !isTextLayer(layer) }),
      ],
    },
    {
      label: "View",
      items: [
        item("zoomIn", "Zoom in"),
        item("zoomOut", "Zoom out"),
        item("fit", "Fit in window"),
        item("actualPixels", "Actual pixels (100%)"),
        sep,
        {
          label: "Scroll wheel zooms",
          checked: preferences.wheelZooms,
          run: () => rt.store.getState().setPreference("wheelZooms", !preferences.wheelZooms),
          hint: preferences.wheelZooms ? "Shift/Alt + wheel pans" : "Ctrl + wheel zooms",
        },
        sep,
        { command: "shortcuts", label: "Keyboard shortcuts" },
      ],
    },
  ];
}
