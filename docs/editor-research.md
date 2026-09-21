# Advanced editor: GIMP behavior research

This preview is an independent browser-native implementation. It does not embed GIMP or include copied GIMP/GEGL source. GIMP's native C/C++ tool classes depend on GTK, GEGL, Babl, and GIMP's document/undo infrastructure; directly pasting these classes into a React application would not run.

## Primary references reviewed (2026-09-21)

- [Move Tool](https://docs.gimp.org/3.0/en/gimp-tool-move.html): move the active layer, pick a layer under the pointer, and move the selection outline separately from pixels.
- [Rectangle Select](https://docs.gimp.org/3.0/en/gimp-tool-rect-select.html): resize handles, numerical position/size, selection modes, and feathering.
- [Scale Tool](https://docs.gimp.org/3.0/en/gimp-tool-scale.html): active-layer transforms, aspect locking, handles, interpolation, and a preview before applying. Rotation and both flips are grouped here for this app at the user's request.
- [Select by Color](https://docs.gimp.org/3.0/en/gimp-tool-by-color-select.html): global matching rather than flood fill; supports disconnected matching regions.
- [Color selection options](https://docs.gimp.org/3.0/en/gimp-tool-fuzzy-select.html): tolerance, merged sampling, transparent areas, and antialiasing.
- [Add Alpha Channel](https://docs.gimp.org/3.0/en/gimp-layer-alpha-add.html): alpha represents per-pixel transparency. This app always uses RGBA buffers, including for its background layer.

Source files inspected in the upstream GNOME/GIMP repository:

- [gimppickable-contiguous-region.cc](https://github.com/GNOME/gimp/blob/master/app/core/gimppickable-contiguous-region.cc): global color-mask generation, comparison criteria, handling transparent pixels, and partial selection coverage.
- [gimpbycolorselecttool.c](https://github.com/GNOME/gimp/blob/master/app/tools/gimpbycolorselecttool.c): selection tool wiring and source sampling.
- [gimpmovetool.c](https://github.com/GNOME/gimp/blob/master/app/tools/gimpmovetool.c): movement target and pick/current-layer behavior.
- [gimprectangleselecttool.c](https://github.com/GNOME/gimp/blob/master/app/tools/gimprectangleselecttool.c): rectangular selection editing and selection combination.
- [gimpscaletool.c](https://github.com/GNOME/gimp/blob/master/app/tools/gimpscaletool.c): dimensional controls and transform preview infrastructure.
- [gimplayer.c](https://github.com/GNOME/gimp/blob/master/app/core/gimplayer.c): alpha and alpha-lock handling.

## Implemented

- Move: current layer or pointer-picked visible layer; selected pixels lifted to a new layer; selection-outline movement; numerical X/Y; keyboard nudge.
- Rectangle selection: eight handles, move outline, X/Y/width/height, square constraint, feather, replace/add/subtract/intersect. Selection masks limit painting, filters, filling, clearing, and clipboard operations.
- Scale: active-layer handle resizing, linked/unlinked dimensions, arbitrary rotation, horizontal/vertical flips, smooth or nearest-neighbor interpolation, Apply/Cancel. Each preview resamples the original layer, avoiding cumulative degradation while adjusting controls.
- Color selection: global RGB/channel/alpha/brightness matching, 0–255 threshold, live threshold adjustment, active-layer or merged sampling, antialiasing, transparency handling, selection combination.
- Layers: RGBA throughout, checkerboard display, opacity/blending, order, duplication, visibility, layer/alpha locks. Transparent new documents are the default. PNG and editable projects preserve alpha; JPG is explicitly composited on white.
- Undo/redo includes masks and pixel edits. Project version 2 includes the active selection and lock properties; version 1 projects remain readable.

## Deliberate limits

This is not GIMP parity: browser Canvas uses 8-bit RGBA and browser-dependent resampling, not GEGL's full precision, color management, or NoHalo/LoHalo filters. No XCF, paths, layer groups, persistent nondestructive layer masks, or GIMP plug-ins. Clipboard is internal to this editor. Transforms apply to a single layer; select/cut/paste first to transform only selected pixels. A transformed layer can extend beyond the canvas, but export clips to document bounds. PNG preserves transparency, while JPG cannot.

The editor warns before closing, but layered projects must be saved explicitly. Mode switching preserves the in-memory workspace and starts in Simple on reload. Scanner data is updated only through Finish editing. Restart clears only the advanced workspace after confirmation and preserves scanner pages. Finish editing commits a pending transform, applies the result, and returns to Simple. The repository deploys to GitHub Pages when main receives a push.
