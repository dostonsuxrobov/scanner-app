// Bucket Fill: click to fill the area of similar color around the pointer
// with the foreground color. The area is found on the visible image and must
// be connected to the click; a selection limits it further.
import { averageSample } from "../engine/color.js";
import { fillLayer } from "../engine/paint/fill-layer.js";
import { colorDistances, distancesToMask } from "../engine/selection/color-match.js";
import { connectedRegion } from "../engine/selection/connected-region.js";
import { combineMasks } from "../engine/selection/mask.js";
import { createSelection } from "../engine/selection/selection.js";
import { editableLayer } from "./helpers/editable-layer.js";
import { liftRect } from "./helpers/lift-selection.js";
import { warnOutsideLayer } from "./helpers/outside-layer.js";
import { createSampleSource } from "./sample-source.js";

export function createBucketTool() {
  const sampleSource = createSampleSource();

  return {
    id: "bucket",
    cursor: () => "crosshair",

    down(rt, e) {
      const { session } = rt;
      const { width, height } = session.doc;
      const x = Math.floor(e.x), y = Math.floor(e.y);
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const layer = editableLayer(rt);
      if (!layer) return;
      const source = sampleSource(rt, true);
      const sample = averageSample(source.data, width, height, x, y, 1);
      // Empty pixels match other empty pixels, so transparent areas fill too.
      const distances = colorDistances(source.data, sample, { transparent: true });
      let mask = connectedRegion(distancesToMask(distances, rt.options("bucket").threshold), width, height, x, y);
      if (session.selection) mask = combineMasks(session.selection.mask, mask, "intersect");
      const region = createSelection(mask, width, height);
      if (!region.count) return rt.toast("Nothing to fill: that point is outside the selection.", true);
      const rect = liftRect(layer, region);
      if (rect.w <= 0) return warnOutsideLayer(rt, layer);
      session.edit("Bucket fill", () => fillLayer(layer, rt.store.getState().colors.fg, region), [[layer, rect]]);
    },

    // The document is going away: free the sampled copy of the image.
    reset() {
      sampleSource.clear();
    },
  };
}
