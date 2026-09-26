// The Advanced image editor. Self-contained: it never changes Simple's pages
// unless you choose File › Add to Simple pages.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createEditorRuntime } from "../editor-runtime.js";
import { createTools } from "../tools/create-tools.js";
import { openFiles } from "../commands/file-commands.js";
import { OPEN_ACCEPT } from "../engine/io/file-kind.js";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts.js";
import { usePasteImages } from "../hooks/use-paste-images.js";
import { EditorContext } from "./editor-context.js";
import { TitleBar } from "./title-bar.jsx";
import { Toolbox } from "./toolbox.jsx";
import { Viewport } from "./viewport/viewport.jsx";
import { SidePanels } from "./side-panels.jsx";
import { StatusBar } from "./status-bar.jsx";
import { DialogHost } from "./dialogs/dialog-host.jsx";
import { BusyOverlay } from "./busy-overlay.jsx";
import "../styles/editor.css";

function useRuntimeOnce() {
  const [rt] = useState(() => {
    const runtime = createEditorRuntime();
    runtime.tools = createTools();
    return runtime;
  });
  return rt;
}

export const AdvancedEditor = forwardRef(function AdvancedEditor({ visible }, ref) {
  const rt = useRuntimeOnce();
  const inputRef = useRef(null);
  const asLayers = useRef(false);

  useImperativeHandle(ref, () => ({ openFiles: (files) => openFiles(rt, files, { asLayers: rt.session.hasDocument }) }), [rt]);

  useEffect(() => {
    rt.filePicker = (layers) => {
      asLayers.current = layers;
      inputRef.current?.click();
    };
  }, [rt]);

  // Warn before leaving the page with unsaved work.
  useEffect(() => {
    const warn = (e) => {
      if (!rt.session.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [rt]);

  useKeyboardShortcuts(rt, visible);
  usePasteImages(rt, visible);

  return (
    <EditorContext.Provider value={rt}>
      <section className="ae" hidden={!visible} aria-label="Advanced image editor">
        <TitleBar />
        <div className="ae-body">
          <Toolbox />
          <main className="ae-center" id="advanced-content">
            <Viewport />
            <StatusBar />
          </main>
          <SidePanels />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={OPEN_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            const files = [...e.target.files];
            e.target.value = "";
            if (files.length) openFiles(rt, files, { asLayers: asLayers.current });
          }}
        />
        <DialogHost />
        <BusyOverlay />
      </section>
    </EditorContext.Provider>
  );
});
