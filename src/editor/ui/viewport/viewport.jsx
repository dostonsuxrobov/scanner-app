// The editing surface: the document canvas, an overlay canvas for outlines
// and handles, on-canvas text entry, and the start screen when empty.
import { useCallback, useEffect, useRef } from "react";
import { fitToScreen } from "../../commands/view-commands.js";
import { useCanvasInput } from "../../hooks/use-canvas-input.js";
import { useElementSize } from "../../hooks/use-element-size.js";
import { useMarchingAnts } from "../../hooks/use-marching-ants.js";
import { useWheelNavigation } from "../../hooks/use-wheel-navigation.js";
import { useRuntime, useSessionVersion } from "../editor-context.js";
import { WelcomeScreen } from "../welcome-screen.jsx";
import { renderDocument } from "./render-document.js";
import { renderOverlay } from "./render-overlay.js";
import { TextEditorOverlay } from "./text-editor-overlay.jsx";

export function Viewport() {
  const rt = useRuntime();
  useSessionVersion();
  const stageRef = useRef(null);
  const documentRef = useRef(null);
  const overlayRef = useRef(null);
  const hasDocument = rt.session.hasDocument;
  const phase = useMarchingAnts(rt, !!rt.session.selection?.count);

  const onSize = useCallback(
    (width, height) => {
      const dpr = window.devicePixelRatio || 1;
      for (const canvas of [documentRef.current, overlayRef.current]) {
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
      }
      const first = !rt.view.getState().width;
      rt.view.setState({ width, height });
      if (first) fitToScreen(rt);
      rt.scheduler.request("document", "overlay");
    },
    [rt],
  );
  useElementSize(stageRef, onSize);
  useCanvasInput(rt, overlayRef);
  useWheelNavigation(rt, stageRef);

  useEffect(() => {
    const paintDocument = () => {
      const composite = rt.compositor.update(rt.session.doc, rt.live);
      renderDocument(documentRef.current.getContext("2d"), {
        composite,
        view: rt.view.getState(),
        dpr: window.devicePixelRatio || 1,
      });
    };
    const paintOverlay = () =>
      renderOverlay(overlayRef.current.getContext("2d"), rt, { dpr: window.devicePixelRatio || 1, phase: phase.current });
    const offDocument = rt.scheduler.add("document", paintDocument);
    const offOverlay = rt.scheduler.add("overlay", paintOverlay);
    rt.scheduler.request("document", "overlay");
    return () => {
      offDocument();
      offOverlay();
    };
  }, [rt, phase]);

  return (
    <div className="ae-stage" ref={stageRef}>
      <canvas ref={documentRef} className="ae-canvas" aria-hidden="true" />
      <canvas
        ref={overlayRef}
        className="ae-canvas ae-canvas-input"
        tabIndex={hasDocument ? 0 : -1}
        aria-label="Image canvas"
        style={{ pointerEvents: hasDocument ? "auto" : "none" }}
      />
      <TextEditorOverlay />
      {!hasDocument && <WelcomeScreen />}
    </div>
  );
}
