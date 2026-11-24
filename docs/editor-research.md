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

## Architecture

The editor lives in `src/editor/`. Every file does one job; the folders separate framework-free logic from React.

| Folder | Responsibility |
| --- | --- |
| `engine/` | Pure document logic: layers, undo history, compositing, selection masks, paint strokes, text layout, transforms, adjustments, file import/export. No React. |
| `tools/` | One pointer tool per file. Each receives tool events from the viewport and edits the document through the session. |
| `commands/` | Menu commands (File, Edit, Select, Image, Layer, View), each operating on the runtime. |
| `keymap/` | The single table of keyboard shortcuts; menus read their labels from it. |
| `overlay/` | Screen-space drawing: marching ants, handles, brush cursor, crop shield, labels. |
| `state/` | Zustand stores for UI state (tool options, colors, dialogs, preferences) and the view (zoom/pan). |
| `hooks/` | Input wiring: pointer/touch, wheel, keyboard, paste, sizing. |
| `ui/` | React components: title bar and menus, toolbox, viewport, panels, fields, dialogs. |

Key design decisions:

- **Undo** stores only the "other" state of each edit and swaps it on undo/redo. Pixel edits store just the changed rectangle; structural edits share layer canvases instead of copying them. The stack is bounded by count and memory; an entry is charged only for what it alone keeps alive (not for a selection or canvas the document still uses). The previous editor PNG-encoded every layer on every pointer-down.
- **Painting** stamps brush dabs into a stroke buffer. The same `applyStroke` function merges the buffer for the live preview and for the final commit, so the preview is exact. Each frame recomposites only the damaged rectangle. Opacity, erasing, alpha lock, and selection clipping are applied with canvas compositing, not per-pixel JavaScript.
- **Viewing** draws the composite into a screen-sized canvas at the current pan/zoom. Reduced views are smoothed; enlarged views show crisp pixels and, at 1200% and above, a pixel grid. Selection outlines, handles, and cursors are drawn in screen space, so they stay 1 px sharp at any zoom. Outline segments off screen or shorter than a pixel are skipped, a large outline is rendered once and reused until the view changes, and outlines above 120,000 segments are not animated.
- **Selection outlines** are traced from each row's transition columns (vertical edges) and their symmetric difference between rows (horizontal edges). Only one linear scan touches every pixel. A property test checks the result against a brute-force trace.
- **Select by Color** computes per-pixel color distances once per click; threshold changes only re-map them, so dragging the threshold stays interactive. Contiguous selection and Bucket Fill keep the part of that match connected to the click (a scanline flood fill).
- **Whole-image turns** (Rotate 90°/180°, Flip) only move pixels, so they are lossless and repeatable. Inside the Transform tool, moves, flips, and quarter turns are placed on whole pixels for the same reason.

## Implemented

- **Documents**: New image (presets, transparent/white/color background). Open images, PDFs (page picker, 72–600 ppi, several pages as layers), and projects. Open as layers; open a Simple page. Drag and drop; paste images from the system clipboard. Save project (keeps layers and editable text). Export PNG/JPEG/WebP/PDF with quality, background, and scale. Close with an unsaved-changes prompt (Export / Save project / Don't save). Exported or saved documents close without a prompt. Simple's pages change only through File › Add to / Update page in Simple.
- **Navigation**: the scroll wheel zooms at the pointer (the View menu can switch it to scrolling). Shift/Alt+wheel and Space-drag or middle-drag pan. Trackpad and touch pinch zoom. Zoom field with presets, Fit, 100%, and keyboard zoom.
- **Move**: layer, selected pixels (lifted to a layer once; further drags keep moving that layer and the outline follows), or outline only. Pick layer under the pointer (Ctrl toggles), Shift axis lock, arrow nudge (Shift = 10 px), numeric X/Y, align to canvas.
- **Rectangle / ellipse select**: a rectangle or the ellipse inscribed in the dragged box. Modes via buttons or modifiers (Shift add, Alt/Ctrl subtract, both intersect). Shift square/circle and Alt from-centre while dragging. Fixed ratio or fixed size, feather, rounded corners (rectangle). Editable handles, move by dragging inside, numeric X/Y/W/H. A click deselects.
- **Select menu**: All, None, Invert, and Feather / Grow / Shrink by a number of pixels (grow and shrink use a square neighbourhood; shrinking does not pull away from the image edge). A selection that covers nothing is the same as no selection.
- **Transform**: scale with handles (Shift toggles proportions, Alt from centre), rotate by dragging outside the box (Shift snaps 15°), numeric px/% size, position, angle, ±90°, flips, smooth or nearest-neighbour. Frames the layer's visible content; transforms only the selected pixels when there is a selection. Enter applies, Esc cancels (Shift+T or Shift+S opens it). The preview is drawn through a matrix and rasterized once, on apply. Text layers stay editable until a transform is actually applied.
- **Select by color / fuzzy select**: global match, or with "Contiguous" only the matching area that touches the click, with a threshold dragged on the canvas or set by slider. Composite/channel/alpha/brightness comparison, sample size, sample all layers (default) or the active layer, transparent areas, antialiasing, feather, and all four modes.
- **Brush / Eraser**: size, hardness, opacity (per stroke, no build-up), smoothing, pen pressure, Shift-click straight lines, Alt-click color pick (Brush), `[`/`]` size and Shift+`[`/`]` hardness, brush outline cursor. Erasing an alpha-locked layer paints the background color. Painting does not enlarge layers: the active layer's boundary is outlined when it differs from the image, and a stroke that misses the layer says so.
- **Bucket fill** (Shift+B): fills the connected area of similar color around the click with the foreground color. The area is found on the visible image; a threshold sets how similar, and a selection limits the fill. Transparent areas can be filled.
- **Text**: on-canvas WYSIWYG typing. Click for point text, drag for a wrapping text box, click a text layer to edit it. Font family (system and Google fonts in groups, plus installed fonts where the browser allows), weight, italic, size, line height, tracking, alignment, underline, strikethrough, color, and outline. Text layers stay editable until painted on, transformed, or the whole image is rotated, flipped, or scaled.
- **Rectangle / Ellipse**: fill, outline, or both; outline width, corner radius, opacity. Shift square/circle, Alt from centre, live dimensions. Each shape goes on its own layer, trimmed to its bounds (optional).
- **Color picker**: foreground or background (Alt), sample size, merged or layer sampling, live comparison ring, hex/RGB readout with copy. FG/BG swatches with swap (X) and reset (D).
- **Crop**: a frame over the image or selection, handles, aspect presets (including custom), thirds/grid guides, shield, numeric fields. Can enlarge the canvas (up to the size limits). Optionally keeps cropped pixels. Enter crops, Esc resets.
- **Image**: Rotate 90° clockwise / counter-clockwise, Rotate 180°, Flip horizontally / vertically for the whole image (every layer and the selection; lossless). Scale image (width/height with a proportions lock; resamples every layer) and Canvas size (adds or trims space around an anchored side without resampling; layers keep their pixels). Text layers become pixel layers on turns and scaling. Each is one undo step and is refused while a layer is locked.
- **Layers**: thumbnails, drag to reorder, double-click to rename (or edit text), visibility, 16 blend modes, opacity (a drag is one undo step), transparency and layer locks, new, duplicate, raise/lower, merge down (the result covers both layers, including pixels outside the image; both must be visible), flatten, rasterize text.
- **Colors and blur**: brightness/contrast/saturation/hue, Threshold (black and white at a chosen level), and Gaussian blur with live preview; Auto contrast (stretches the darkest part to black and the lightest to white, one range for all channels, ignoring the extreme 0.5% of pixels), desaturate, and invert. All respect the selection, including feathered edges; Auto contrast also measures only the selected part. Blur repeats edge pixels, so an opaque layer stays opaque at its borders.
- **Menus**: File, Edit, Select, Image, Colors, Layer, View, with shortcut labels. Undo items name the action ("Undo Brush"). The shortcuts reference is under View (or press `?`). Small screens get a single compact menu and a panel drawer.

## Deliberate limits

This is not GIMP parity: browser Canvas uses 8-bit RGBA and browser-dependent resampling, not GEGL's full precision, color management, or NoHalo/LoHalo filters. There is no XCF, paths, layer groups, layer masks, or plug-ins. Scaling or turning the whole image converts text layers to pixels and Scale Image / Canvas Size clear the selection. Images are limited to 8,000 px per side and 36 megapixels; larger images and PDF pages are reduced to fit. Web fonts need a network connection; without one, a similar local font is used and the editor says so. Project files from the previous editor (versions 1–2) still open. The repository deploys to GitHub Pages when main receives a push.
