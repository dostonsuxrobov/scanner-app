// Select by Color: click a color to select every matching pixel in the image.
// Drag left/right after clicking to change the threshold live; the slider in
// Tool Options re-applies the last click too.
import { averageSample } from "../engine/color.js";
import { colorDistances, distancesToMask } from "../engine/selection/color-match.js";
import { combineMasks, featherMask } from "../engine/selection/mask.js";
import { createSelection } from "../engine/selection/selection.js";
import { drawLabel } from "../overlay/label.js";
import { selectionMode } from "./helpers/selection-mode.js";
import { selectionCursor } from "../overlay/selection-cursor.js";
import { createSampleSource } from "./sample-source.js";

export function createColorSelectTool() {
  const sampleSource = createSampleSource();
  let last = null; // { distances, base, mode, revision }
  let drag = null; // { startX, startThreshold, pointer }
  let frame = 0;

  function build(rt) {
    const { session } = rt;
    const o = rt.options("bycolor");
    const { width, height } = session.doc;
    let mask = distancesToMask(last.distances, o.threshold, o.antialias);
    mask = featherMask(mask, width, height, o.feather);
    return createSelection(combineMasks(last.base?.mask, mask, last.mode), width, height);
  }

  // Updates the selection made by the last click without a new undo step.
  function reapply(rt) {
    if (!last || last.revision !== rt.session.revision) return false;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => rt.session.previewSelection(build(rt)));
    return true;
  }

  return {
    id: "bycolor",
    cursor: (rt, e) => selectionCursor(e ? selectionMode(e, rt.options("bycolor").mode) : rt.options("bycolor").mode),

    down(rt, e) {
      const { session } = rt;
      const o = rt.options("bycolor");
      const { width, height } = session.doc;
      const x = Math.floor(e.x), y = Math.floor(e.y);
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const source = sampleSource(rt, o.sampleMerged);
      const sample = averageSample(source.data, width, height, x, y, o.sampleSize);
      if (sample[3] === 0 && !o.transparent) {
        rt.toast("That pixel is transparent. Turn on “Select transparent areas” to select empty pixels.", true);
        return;
      }
      const mode = selectionMode(e, o.mode);
      const base = session.selection;
      const distances = colorDistances(source.data, sample, { criterion: o.criterion, transparent: o.transparent });
      last = { distances, base, mode };
      session.setSelection(build(rt), "Select by color");
      last.revision = session.revision;
      drag = { startX: e.sx, startThreshold: o.threshold, pointer: e };
    },

    move(rt, e) {
      if (!drag) return;
      const threshold = Math.max(0, Math.min(255, Math.round(drag.startThreshold + (e.sx - drag.startX) / 2)));
      drag.pointer = e;
      if (threshold !== rt.options("bycolor").threshold) {
        rt.store.getState().setOption("bycolor", "threshold", threshold);
        reapply(rt);
      }
      rt.redrawOverlay();
    },

    up(rt) {
      drag = null;
      rt.redrawOverlay();
    },

    cancel() {
      drag = null;
    },

    reapply,

    overlay(rt, ctx) {
      if (drag && Math.abs(drag.pointer.sx - drag.startX) > 2)
        drawLabel(ctx, `Threshold ${rt.options("bycolor").threshold}`, drag.pointer.sx, drag.pointer.sy);
    },
  };
}
