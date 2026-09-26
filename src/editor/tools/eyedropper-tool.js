// Color Picker: click or drag to sample. Sets the foreground color, or the
// background color with Alt. A ring shows the new color against the old one.
import { averageSample, rgbToHex } from "../engine/color.js";
import { drawColorLoupe } from "../overlay/color-loupe.js";
import { createSampleSource } from "./sample-source.js";

export function createEyedropperTool() {
  const sampleSource = createSampleSource();
  let drag = null; // { target, previous, pointer }

  function sample(rt, e) {
    const { session, store } = rt;
    const { width, height } = session.doc;
    const x = Math.floor(e.x), y = Math.floor(e.y);
    drag.pointer = e;
    if (x >= 0 && y >= 0 && x < width && y < height) {
      const o = rt.options("eyedropper");
      const [r, g, b, a] = averageSample(sampleSource(rt, o.sampleMerged).data, width, height, x, y, o.sampleSize);
      if (a > 0) store.getState().setColor(drag.target, rgbToHex([r, g, b]));
    }
    rt.redrawOverlay();
  }

  return {
    id: "eyedropper",
    cursor: () => "crosshair",
    down(rt, e) {
      const target = e.alt ? "bg" : "fg";
      drag = { target, previous: rt.store.getState().colors[target] };
      sample(rt, e);
    },
    move(rt, e) {
      if (drag) sample(rt, e);
    },
    up(rt) {
      drag = null;
      rt.redrawOverlay();
    },
    cancel() {
      drag = null;
    },
    overlay(rt, ctx) {
      if (!drag?.pointer) return;
      const current = rt.store.getState().colors[drag.target];
      drawColorLoupe(ctx, drag.pointer.sx, drag.pointer.sy, current, drag.previous);
    },
  };
}
