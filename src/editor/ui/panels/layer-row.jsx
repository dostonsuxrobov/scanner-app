// One row in the Layers panel: visibility, thumbnail, name (double-click to
// rename), and lock badges. Rows can be dragged to reorder.
import { useState } from "react";
import { Eye, EyeOff, Lock, Type } from "lucide-react";
import { selectLayer, setLayerProperty } from "../../commands/layer-commands.js";
import { useRuntime } from "../editor-context.js";
import { LayerThumbnail } from "./layer-thumbnail.jsx";

export function LayerRow({ layer, active, doc, version, onDragStart, onDropAt, index }) {
  const rt = useRuntime();
  const [renaming, setRenaming] = useState(false);
  const [over, setOver] = useState(false);
  const finishRename = (value) => {
    setRenaming(false);
    const name = value.trim();
    if (name && name !== layer.name) setLayerProperty(rt, layer.id, "name", name, "Rename layer");
  };
  return (
    <li
      className={`ae-layer${active ? " is-active" : ""}${over ? " is-drop" : ""}${layer.visible ? "" : " is-hidden"}`}
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/x-layer", layer.id);
        onDragStart(layer.id);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("text/x-layer")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropAt(index);
      }}
    >
      <button
        type="button"
        className="ae-icon-button"
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        title={layer.visible ? "Hide layer" : "Show layer"}
        onClick={() => setLayerProperty(rt, layer.id, "visible", !layer.visible, layer.visible ? "Hide layer" : "Show layer")}
      >
        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        type="button"
        className="ae-layer-main"
        aria-pressed={active}
        aria-label={`Select layer ${layer.name}`}
        onClick={() => selectLayer(rt, layer.id)}
        onDoubleClick={() => {
          if (!layer.text) return setRenaming(true);
          // Double-clicking a text layer edits its text, as in Photoshop.
          rt.setTool("text");
          rt.tools.text.edit(rt, layer);
        }}
      >
        <LayerThumbnail layer={layer} docWidth={doc.width} docHeight={doc.height} version={version} />
        {renaming ? null : <span className="ae-layer-name">{layer.name}</span>}
      </button>
      {renaming && (
        <input
          className="ae-layer-rename"
          aria-label="Layer name"
          defaultValue={layer.name}
          autoFocus
          onFocus={(e) => e.target.select()}
          onBlur={(e) => finishRename(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRenaming(false);
          }}
        />
      )}
      <span className="ae-layer-badges">
        {layer.text && <Type size={12} aria-label="Text layer" />}
        {(layer.locked || layer.alphaLocked) && <Lock size={12} aria-label={layer.locked ? "Locked" : "Transparency locked"} />}
      </span>
      {!renaming && !layer.text && (
        <button type="button" className="ae-layer-rename-button" aria-label={`Rename ${layer.name}`} onClick={() => setRenaming(true)}>
          Rename
        </button>
      )}
    </li>
  );
}
