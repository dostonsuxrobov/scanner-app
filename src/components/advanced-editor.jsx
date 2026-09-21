import { useEffect, useRef, useState, useMemo } from "react";
import {
  Scaling,
  Blend,
  SquareDashed,
  Paintbrush,
  Eraser,
  Type,
  Square,
  Circle,
  Pipette,
  Crop,
  Move,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  Download,
  Upload,
  RotateCw,
  FlipHorizontal,
  Layers,
  Check,
  ImagePlus,
} from "lucide-react";
import { useScannerStore } from "../store/scanner-store";
import { exportSinglePage } from "../lib/export-pdf";
import { showToast } from "../lib/utils";
import {
  maskCanvas,
  selectionFromMask,
  rectangleMask,
  combineMasks,
  translateMask,
  selectColor,
  overlayCanvas,
  rasterTransform,
} from "../lib/editor/selection";
import "./advanced-editor.css";

const makeCanvas = (w, h) =>
  Object.assign(document.createElement("canvas"), { width: w, height: h });
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not open image"));
    image.src = src;
  });
const freshLayer = (name, canvas) => ({
  id: crypto.randomUUID(),
  name,
  canvas,
  visible: true,
  opacity: 100,
  blend: "source-over",
  x: 0,
  y: 0,
  locked: false,
  alphaLocked: false,
});
const toolList = [
  ["move", Move, "Move Tool"],
  ["select", SquareDashed, "Rectangle Select"],
  ["scale", Scaling, "Scale Tool"],
  ["bycolor", Blend, "Select by Color"],
  ["brush", Paintbrush, "Brush"],
  ["eraser", Eraser, "Eraser"],
  ["text", Type, "Text"],
  ["rectangle", Square, "Rectangle"],
  ["ellipse", Circle, "Ellipse"],
  ["eyedropper", Pipette, "Color picker"],
  ["crop", Crop, "Crop"],
];
const hints = {
  move: "Drag a layer, selected pixels, or the selection outline.",
  select: "Drag a rectangle. Shift adds; Ctrl subtracts; both intersect.",
  scale: "Drag a handle, or enter dimensions. Apply or cancel the preview.",
  bycolor: "Click a color to select matching pixels across the image.",
  brush: "Draw on the active layer.",
  eraser: "Erase to transparency.",
  text: "Enter text on the right, then click the canvas.",
  rectangle: "Drag to draw a rectangle.",
  ellipse: "Drag to draw an ellipse.",
  eyedropper: "Click the image to sample a color.",
  crop: "Drag an area, then choose Crop to selection.",
};
const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button
      type="button"
      className="ae-icon"
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}

function LayerThumbnail({ layer, version }) {
  const thumbnail = useMemo(() => {
    const c = makeCanvas(40, 40),
      ctx = c.getContext("2d");
    const ratio = Math.min(40 / layer.canvas.width, 40 / layer.canvas.height);
    const w = layer.canvas.width * ratio,
      h = layer.canvas.height * ratio;
    ctx.drawImage(layer.canvas, (40 - w) / 2, (40 - h) / 2, w, h);
    return c.toDataURL();
  }, [layer.canvas, version]);
  return <img src={thumbnail} alt="" />;
}

// This workspace owns its layer buffers. Scanner pages change only on explicit Apply.
export function AdvancedEditor({
  visible,
  autoOpenPage = true,
  onFinish,
  onRestart,
}) {
  const pages = useScannerStore((s) => s.pages);
  const activePage = useScannerStore((s) => s.activePage());
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const uploadRef = useRef(null);
  const projectRef = useRef(null);
  const restartDialogRef = useRef(null);
  const doc = useRef({
    width: 1200,
    height: 900,
    layers: [],
    activeId: null,
    sourceId: null,
    name: "Untitled",
  });
  const history = useRef({ past: [], future: [] });
  const gesture = useRef(null);
  const [version, setVersion] = useState(0);
  const [tool, setTool] = useState("move");
  const [color, setColor] = useState("#18181b");
  const [size, setSize] = useState(16);
  const [fill, setFill] = useState(false);
  const [text, setText] = useState("Your text");
  const [fontSize, setFontSize] = useState(48);
  const [zoom, setZoom] = useState(60);
  const [selection, setSelectionState] = useState(null);
  const selectionRef = useRef(null);
  const setSelection = (value) => {
    selectionRef.current = value;
    setSelectionState(value);
  };
  const [selectionMode, setSelectionMode] = useState("replace");
  const [feather, setFeather] = useState(0);
  const [squareSelection, setSquareSelection] = useState(false);
  const [moveTarget, setMoveTarget] = useState("layer");
  const [autoPick, setAutoPick] = useState(false);
  const [threshold, setThreshold] = useState(15);
  const [sampleMerged, setSampleMerged] = useState(false);
  const [selectTransparent, setSelectTransparent] = useState(false);
  const [antialias, setAntialias] = useState(true);
  const [criterion, setCriterion] = useState("rgb");
  const colorSample = useRef(null);
  const [transparentCanvas, setTransparentCanvas] = useState(true);
  const [transformDraft, setTransformDraft] = useState(null);
  const [keepAspect, setKeepAspect] = useState(true);
  const [smoothScale, setSmoothScale] = useState(true);
  const clipboard = useRef(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [busy, setBusy] = useState(false);
  const [newWidth, setNewWidth] = useState(1200);
  const [newHeight, setNewHeight] = useState(900);
  const [format, setFormat] = useState("png");
  const refresh = () => setVersion((v) => v + 1);
  const currentLayer = () =>
    doc.current.layers.find((l) => l.id === doc.current.activeId);
  const transformed = useMemo(() => {
    if (!transformDraft) return null;
    try {
      const t = transformDraft;
      return rasterTransform(
        t.source,
        t.w,
        t.h,
        t.angle,
        t.flipX,
        t.flipY,
        smoothScale,
      );
    } catch {
      return null;
    }
  }, [transformDraft, smoothScale]);
  const composite = (includePreview = true) => {
    const d = doc.current,
      c = makeCanvas(d.width, d.height),
      ctx = c.getContext("2d");
    d.layers.forEach((l) => {
      if (!l.visible) return;
      ctx.globalAlpha = l.opacity / 100;
      ctx.globalCompositeOperation = l.blend;
      if (includePreview && transformDraft?.layerId === l.id && transformed)
        ctx.drawImage(
          transformed,
          transformDraft.x + (transformDraft.w - transformed.width) / 2,
          transformDraft.y + (transformDraft.h - transformed.height) / 2,
        );
      else ctx.drawImage(l.canvas, l.x, l.y);
    });
    return c;
  };
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d = doc.current;
    canvas.width = d.width;
    canvas.height = d.height;
    canvas.getContext("2d").drawImage(composite(), 0, 0);
  };
  const snapshot = () => ({
    ...doc.current,
    selectionState: selectionRef.current
      ? {
          src: maskCanvas(
            selectionRef.current.mask,
            doc.current.width,
            doc.current.height,
          ).toDataURL(),
          rect: selectionRef.current.rect,
        }
      : null,
    layers: doc.current.layers.map((l) => ({
      ...l,
      canvas: undefined,
      src: l.canvas.toDataURL("image/png"),
    })),
  });
  const checkpoint = () => {
    const h = history.current;
    h.past.push(snapshot());
    // Bound raster history by both count and serialized size.
    while (
      h.past.length > 20 ||
      (h.past.length > 1 &&
        h.past.reduce(
          (n, s) =>
            n +
            s.layers.reduce(
              (a, l) => a + l.src.length * 2,
              (s.selectionState?.src?.length || 0) * 2,
            ),
          0,
        ) >
          64 * 1024 * 1024)
    )
      h.past.shift();
    h.future = [];
  };
  const restore = async (saved) => {
    const layers = await Promise.all(
      saved.layers.map(async (l) => {
        const img = await loadImage(l.src);
        if (
          img.width > 6000 ||
          img.height > 6000 ||
          img.width * img.height > 16000000
        )
          throw new Error("Project layer exceeds 16 megapixels.");
        const c = makeCanvas(img.width, img.height);
        c.getContext("2d").drawImage(img, 0, 0);
        const { src, ...rest } = l;
        return { ...rest, canvas: c };
      }),
    );
    const { selectionState, ...documentState } = saved;
    let restoredSelection = null;
    if (selectionState?.src) {
      if (!/^data:image\/png;base64,/.test(selectionState.src))
        throw new Error("Invalid selection mask.");
      const img = await loadImage(selectionState.src);
      if (img.width !== saved.width || img.height !== saved.height)
        throw new Error("Selection mask dimensions do not match.");
      const c = makeCanvas(saved.width, saved.height),
        ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const rgba = ctx.getImageData(0, 0, saved.width, saved.height).data;
      restoredSelection = selectionFromMask(
        Uint8ClampedArray.from(
          { length: saved.width * saved.height },
          (_, i) => rgba[i * 4 + 3],
        ),
        saved.width,
        saved.height,
        selectionState.rect,
      );
    }
    doc.current = { ...documentState, layers };
    setSelection(restoredSelection);
    colorSample.current = null;
    setTransformDraft(null);
    refresh();
  };
  const travel = async (forward) => {
    if (busy) return;
    const h = history.current,
      from = forward ? h.future : h.past,
      to = forward ? h.past : h.future;
    if (!from.length) return;
    setBusy(true);
    const target = from[from.length - 1];
    try {
      const now = snapshot();
      await restore(target);
      from.pop();
      to.push(now);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const mutate = (fn) => {
    if (busy) return;
    checkpoint();
    setTransformDraft(null);
    colorSample.current = null;
    fn();
    refresh();
  };
  const fit = (w = doc.current.width, h = doc.current.height) => {
    const el = stageRef.current;
    if (el)
      setZoom(
        Math.max(
          5,
          Math.min(
            100,
            Math.floor(
              Math.min((el.clientWidth - 80) / w, (el.clientHeight - 80) / h) *
                100,
            ),
          ),
        ),
      );
  };
  useEffect(() => {
    render();
  }, [version, visible, transformed]);
  useEffect(() => {
    if (visible && autoOpenPage && !doc.current.layers.length && activePage)
      openPage(activePage);
  }, [visible]);
  useEffect(() => {
    const key = (e) => {
      if (
        !visible ||
        busy ||
        restartDialogRef.current?.open ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
        e.target.isContentEditable
      )
        return;
      const modifier = e.ctrlKey || e.metaKey,
        key = e.key.toLowerCase();
      if (modifier && key === "z") {
        e.preventDefault();
        setTransformDraft(null);
        travel(e.shiftKey);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (transformDraft) setTransformDraft(null);
        else changeSelection(null);
        return;
      }
      if (e.key === "Enter" && transformDraft) {
        e.preventDefault();
        commitTransform();
        return;
      }
      if (modifier && !e.shiftKey && key === "a") {
        e.preventDefault();
        changeSelection(
          selectionFromMask(
            new Uint8ClampedArray(doc.current.width * doc.current.height).fill(
              255,
            ),
            doc.current.width,
            doc.current.height,
          ),
        );
        return;
      }
      if (modifier && e.shiftKey && key === "a") {
        e.preventDefault();
        changeSelection(null);
        return;
      }
      if (modifier && ["c", "x", "v"].includes(key)) {
        e.preventDefault();
        key === "v" ? pastePixels() : copyPixels(key === "x");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        clearPixels();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 25 : 1,
          dx =
            e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (tool === "select" || moveTarget === "selection") {
          if (selection)
            changeSelection(
              selectionFromMask(
                translateMask(
                  selection.mask,
                  doc.current.width,
                  doc.current.height,
                  dx,
                  dy,
                ),
                doc.current.width,
                doc.current.height,
                selection.rect
                  ? {
                      ...selection.rect,
                      x: selection.rect.x + dx,
                      y: selection.rect.y + dy,
                    }
                  : null,
              ),
            );
        } else {
          const l = currentLayer();
          if (l && !l.locked)
            mutate(() => {
              l.x += dx;
              l.y += dy;
            });
        }
        return;
      }
      if (!modifier) {
        const shortcut =
          e.shiftKey && key === "s"
            ? "scale"
            : e.shiftKey && key === "o"
              ? "bycolor"
              : {
                  b: "brush",
                  e: "eraser",
                  m: "move",
                  v: "move",
                  t: "text",
                  r: "select",
                  c: "crop",
                  i: "eyedropper",
                }[key];
        if (shortcut) {
          e.preventDefault();
          chooseTool(shortcut);
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const warn = (e) => {
      if (doc.current.layers.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function openPage(page) {
    if (busy) return;
    setBusy(true);
    try {
      const img = await loadImage(page.src);
      checkpoint();
      const c = makeCanvas(img.width, img.height);
      c.getContext("2d").drawImage(img, 0, 0);
      const layer = freshLayer("Background", c);
      doc.current = {
        width: img.width,
        height: img.height,
        layers: [layer],
        activeId: layer.id,
        sourceId: page.id,
        name: page.name,
      };
      setSelection(null);
      setTransformDraft(null);
      colorSample.current = null;
      refresh();
      fit(img.width, img.height);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  function blank() {
    const w = Number(newWidth),
      h = Number(newHeight);
    if (
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      w < 1 ||
      h < 1 ||
      w > 6000 ||
      h > 6000 ||
      w * h > 16000000
    )
      return showToast(
        "Use whole dimensions up to 6,000 px and 16 megapixels.",
        true,
      );
    mutate(() => {
      const c = makeCanvas(w, h);
      const ctx = c.getContext("2d");
      if (!transparentCanvas) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      const layer = freshLayer(
        transparentCanvas ? "Transparent layer" : "Background",
        c,
      );
      doc.current = {
        width: w,
        height: h,
        layers: [layer],
        activeId: layer.id,
        sourceId: null,
        name: "Untitled",
      };
    });
    setSelection(null);
    setTransformDraft(null);
    colorSample.current = null;
    fit(w, h);
  }
  async function importLayer(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (doc.current.layers.length >= 40)
      return showToast("Maximum 40 layers per project.", true);
    setTransformDraft(null);
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      if (
        img.width > 6000 ||
        img.height > 6000 ||
        img.width * img.height > 16000000
      )
        throw new Error(
          "Image is too large. Use an image under 16 megapixels.",
        );
      checkpoint();
      const c = makeCanvas(img.width, img.height);
      c.getContext("2d").drawImage(img, 0, 0);
      const l = freshLayer(file.name, c);
      if (!doc.current.layers.length) {
        doc.current.width = img.width;
        doc.current.height = img.height;
        doc.current.name = file.name;
        fit(img.width, img.height);
      }
      doc.current.layers.push(l);
      doc.current.activeId = l.id;
      colorSample.current = null;
      refresh();
    } catch (e) {
      showToast(e.message, true);
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  function chooseTool(next) {
    gesture.current = null;
    setTool(next);
    setTransformDraft(null);
    colorSample.current = null;
    if (next === "scale") beginTransform();
  }
  function canEdit(layer = currentLayer(), alpha = false) {
    if (!layer) return false;
    if (layer.locked) {
      showToast("Unlock this layer before editing.", true);
      return false;
    }
    if (alpha && layer.alphaLocked) {
      showToast("Unlock alpha to change transparency.", true);
      return false;
    }
    return true;
  }
  function changeSelection(next) {
    if (busy) return;
    checkpoint();
    colorSample.current = null;
    setSelection(next);
    refresh();
  }
  function modeFor(e) {
    return e.shiftKey && (e.ctrlKey || e.metaKey)
      ? "intersect"
      : e.shiftKey
        ? "add"
        : e.ctrlKey || e.metaKey
          ? "subtract"
          : selectionMode;
  }
  function setMask(
    mask,
    mode = "replace",
    base = selectionRef.current,
    rect = null,
  ) {
    const d = doc.current;
    const combined = combineMasks(base?.mask, mask, mode);
    setSelection(
      selectionFromMask(
        combined,
        d.width,
        d.height,
        mode === "replace" && !feather ? rect : null,
      ),
    );
  }
  function layerInDocument(l) {
    const c = makeCanvas(doc.current.width, doc.current.height);
    c.getContext("2d").drawImage(l.canvas, l.x, l.y);
    return c;
  }
  function sampleColorAt(p, e) {
    const d = doc.current,
      l = currentLayer();
    if (!l) return;
    const c = sampleMerged ? composite(false) : layerInDocument(l),
      ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, d.width, d.height).data;
    const x = Math.min(d.width - 1, Math.max(0, Math.floor(p.x))),
      y = Math.min(d.height - 1, Math.max(0, Math.floor(p.y)));
    checkpoint();
    colorSample.current = {
      data,
      sample: Array.from(
        data.slice((y * d.width + x) * 4, (y * d.width + x) * 4 + 4),
      ),
      base: selectionRef.current,
      mode: modeFor(e),
    };
    updateColorSelection();
    refresh();
  }
  function updateColorSelection(options = {}) {
    const sample = colorSample.current;
    if (!sample) return;
    const m = selectColor(sample.data, sample.sample, {
      threshold,
      antialias,
      transparent: selectTransparent,
      criterion,
      ...options,
    });
    setMask(m, sample.mode, sample.base);
  }
  function selectionOnLayer(l) {
    if (!selectionRef.current) return null;
    const d = doc.current,
      c = makeCanvas(l.canvas.width, l.canvas.height);
    c.getContext("2d").drawImage(
      maskCanvas(selectionRef.current.mask, d.width, d.height),
      -l.x,
      -l.y,
    );
    return c;
  }
  function clearPixels() {
    if (!canEdit(undefined, true)) return;
    const l = currentLayer();
    mutate(() => {
      const ctx = l.canvas.getContext("2d"),
        mask = selectionOnLayer(l);
      ctx.save();
      if (mask) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(mask, 0, 0);
      } else ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      ctx.restore();
    });
  }
  function fillPixels() {
    if (!canEdit()) return;
    const l = currentLayer();
    mutate(() => {
      const c = makeCanvas(l.canvas.width, l.canvas.height),
        ctx = c.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
      const mask = selectionOnLayer(l);
      if (mask) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mask, 0, 0);
      }
      const out = l.canvas.getContext("2d");
      out.save();
      out.globalCompositeOperation = l.alphaLocked
        ? "source-atop"
        : "source-over";
      out.drawImage(c, 0, 0);
      out.restore();
    });
  }
  function selectedPixels(l) {
    const d = doc.current,
      sel = selectionRef.current;
    if (sel && !sel.count) return null;
    const b = sel || {
      x: Math.max(0, l.x),
      y: Math.max(0, l.y),
      w: Math.min(d.width, l.x + l.canvas.width) - Math.max(0, l.x),
      h: Math.min(d.height, l.y + l.canvas.height) - Math.max(0, l.y),
    };
    if (b.w < 1 || b.h < 1) return null;
    const c = makeCanvas(b.w, b.h),
      ctx = c.getContext("2d");
    ctx.drawImage(l.canvas, l.x - b.x, l.y - b.y);
    if (sel) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskCanvas(sel.mask, d.width, d.height), -b.x, -b.y);
    }
    return { canvas: c, x: b.x, y: b.y };
  }
  function copyPixels(cut = false) {
    const l = currentLayer();
    if (!l || (cut && !canEdit(l, true))) return;
    const part = selectedPixels(l);
    if (!part) return;
    clipboard.current = part;
    setHasClipboard(true);
    if (cut) clearPixels();
    showToast(
      cut
        ? "Selection cut. Paste to a new layer."
        : "Selection copied. Paste to a new layer.",
    );
  }
  function pastePixels() {
    const part = clipboard.current;
    if (!part || doc.current.layers.length >= 40) return;
    mutate(() => {
      const c = makeCanvas(part.canvas.width, part.canvas.height);
      c.getContext("2d").drawImage(part.canvas, 0, 0);
      const l = { ...freshLayer("Pasted selection", c), x: part.x, y: part.y };
      doc.current.layers.push(l);
      doc.current.activeId = l.id;
    });
    setSelection(null);
    setTransformDraft(null);
  }
  function liftPixels() {
    const l = currentLayer();
    if (
      !selectionRef.current?.count ||
      !canEdit(l, true) ||
      doc.current.layers.length >= 40
    )
      return null;
    const part = selectedPixels(l);
    if (!part) return null;
    const ctx = l.canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(selectionOnLayer(l), 0, 0);
    ctx.restore();
    const lifted = {
      ...freshLayer("Moved selection", part.canvas),
      x: part.x,
      y: part.y,
    };
    doc.current.layers.push(lifted);
    doc.current.activeId = lifted.id;
    setSelection(null);
    return lifted;
  }
  function beginTransform() {
    const l = currentLayer();
    if (!l || !canEdit(l)) return;
    setTransformDraft({
      layerId: l.id,
      source: l.canvas,
      x: l.x,
      y: l.y,
      w: l.canvas.width,
      h: l.canvas.height,
      angle: 0,
      flipX: false,
      flipY: false,
    });
  }
  function updateTransform(field, value) {
    if (!transformDraft) return;
    const t = { ...transformDraft };
    if (field === "w" || field === "h") {
      const n = Math.max(1, Math.min(6000, Math.round(Number(value) || 1)));
      if (keepAspect)
        t[field === "w" ? "h" : "w"] = Math.max(
          1,
          Math.round(n * (field === "w" ? t.h / t.w : t.w / t.h)),
        );
      t[field] = n;
    } else t[field] = value;
    setTransformDraft(t);
  }
  function commitTransform() {
    const t = transformDraft,
      l = currentLayer();
    if (!t || !l || t.layerId !== l.id || !canEdit(l)) return;
    if (!transformed)
      return showToast("Transform exceeds 6,000 px or 16 megapixels.", true);
    mutate(() => {
      l.canvas = transformed;
      l.x = Math.round(t.x + (t.w - transformed.width) / 2);
      l.y = Math.round(t.y + (t.h - transformed.height) / 2);
    });
    setTransformDraft(null);
  }
  function point(e, clamp = true) {
    const r = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) * doc.current.width) / r.width,
      y = ((e.clientY - r.top) * doc.current.height) / r.height;
    return {
      x: clamp ? Math.max(0, Math.min(doc.current.width, x)) : x,
      y: clamp ? Math.max(0, Math.min(doc.current.height, y)) : y,
    };
  }
  const box = (a, b) => ({
    x: Math.floor(Math.min(a.x, b.x)),
    y: Math.floor(Math.min(a.y, b.y)),
    w: Math.max(1, Math.round(Math.abs(a.x - b.x))),
    h: Math.max(1, Math.round(Math.abs(a.y - b.y))),
  });
  function boundedRect(r) {
    const d = doc.current,
      x = Math.max(0, Math.min(d.width - 1, Math.round(r.x))),
      y = Math.max(0, Math.min(d.height - 1, Math.round(r.y)));
    return {
      x,
      y,
      w: Math.max(1, Math.min(d.width - x, Math.round(r.w))),
      h: Math.max(1, Math.min(d.height - y, Math.round(r.h))),
    };
  }
  function editRect(field, value) {
    const old = selection?.rect;
    if (!old) return;
    const r = boundedRect({ ...old, [field]: Number(value) || 0 });
    changeSelection(
      selectionFromMask(
        rectangleMask(doc.current.width, doc.current.height, r),
        doc.current.width,
        doc.current.height,
        r,
      ),
    );
  }
  function drawWith(ctx, layer, callback) {
    // Interpolate the result through the selection mask; this also works for
    // erasing and partially selected (antialiased/feathered) pixels.
    const before =
      selectionRef.current || layer.alphaLocked
        ? ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
        : null;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    callback();
    ctx.restore();
    if (before) {
      const after = ctx.getImageData(
          0,
          0,
          layer.canvas.width,
          layer.canvas.height,
        ),
        sel = selectionRef.current,
        d = doc.current;
      for (let i = 0; i < before.data.length / 4; i++) {
        const x = (i % layer.canvas.width) + layer.x,
          y = Math.floor(i / layer.canvas.width) + layer.y;
        const amount = !sel
          ? 1
          : x >= 0 && y >= 0 && x < d.width && y < d.height
            ? sel.mask[y * d.width + x] / 255
            : 0;
        const p = i * 4,
          oldA = before.data[p + 3] / 255,
          newA = after.data[p + 3] / 255,
          alpha = oldA * (1 - amount) + newA * amount;
        for (let k = 0; k < 3; k++)
          after.data[p + k] = alpha
            ? (before.data[p + k] * oldA * (1 - amount) +
                after.data[p + k] * newA * amount) /
              alpha
            : 0;
        after.data[p + 3] = layer.alphaLocked
          ? before.data[p + 3]
          : alpha * 255;
      }
      ctx.putImageData(after, 0, 0);
    }
  }
  function handleStart(e, kind, handle = "move") {
    if (busy) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e, false);
    if (kind === "transform") {
      if (!transformDraft) return;
      gesture.current = {
        kind,
        handle,
        start: p,
        original: { ...transformDraft },
      };
    } else {
      if (!selection?.rect) return;
      checkpoint();
      gesture.current = {
        kind: "rect-handle",
        handle,
        start: p,
        original: { ...selection.rect },
      };
    }
  }
  function start(e) {
    if (busy || e.button !== 0) return;
    let l = currentLayer();
    if (!l) return;
    const p = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "scale") {
      if (!transformDraft) beginTransform();
      return;
    }
    if (tool === "select" || tool === "crop") {
      checkpoint();
      gesture.current = {
        kind: "select",
        start: p,
        base: selectionRef.current,
        mode: modeFor(e),
      };
      return;
    }
    if (tool === "bycolor") {
      sampleColorAt(p, e);
      return;
    }
    if (tool === "eyedropper") {
      const pixel = composite()
        .getContext("2d")
        .getImageData(
          Math.min(doc.current.width - 1, Math.floor(p.x)),
          Math.min(doc.current.height - 1, Math.floor(p.y)),
          1,
          1,
        ).data;
      setColor(
        "#" +
          [...pixel]
            .slice(0, 3)
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(""),
      );
      return;
    }
    if (tool === "move" && moveTarget === "selection") {
      if (!selection) return;
      checkpoint();
      gesture.current = {
        kind: "selection-move",
        start: p,
        original: selection,
      };
      return;
    }
    if (tool === "move" && moveTarget === "layer" && autoPick !== e.shiftKey) {
      const picked = [...doc.current.layers].reverse().find((candidate) => {
        if (!candidate.visible || !candidate.opacity) return false;
        const x = Math.floor(p.x - candidate.x),
          y = Math.floor(p.y - candidate.y);
        return (
          x >= 0 &&
          y >= 0 &&
          x < candidate.canvas.width &&
          y < candidate.canvas.height &&
          candidate.canvas.getContext("2d").getImageData(x, y, 1, 1).data[3] > 0
        );
      });
      if (!picked) return;
      l = picked;
      doc.current.activeId = l.id;
      refresh();
    }
    if (!l.visible)
      return showToast("Show this layer before editing it.", true);
    if (
      !canEdit(
        l,
        tool === "eraser" || (tool === "move" && moveTarget === "pixels"),
      )
    )
      return;
    if (
      tool === "move" &&
      moveTarget === "pixels" &&
      (!selection?.count || doc.current.layers.length >= 40)
    )
      return;
    checkpoint();
    if (tool === "move" && moveTarget === "pixels") {
      l = liftPixels();
      if (!l) return;
    }
    if (tool === "text") {
      if (doc.current.layers.length >= 40) return;
      const c = makeCanvas(doc.current.width, doc.current.height);
      const ctx = c.getContext("2d");
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px sans-serif`;
      text
        .split("\n")
        .forEach((line, i) =>
          ctx.fillText(line, p.x, p.y + i * fontSize * 1.2),
        );
      const layer = freshLayer(text.slice(0, 24) || "Text", c);
      doc.current.layers.push(layer);
      doc.current.activeId = layer.id;
      refresh();
      return;
    }
    const backup = makeCanvas(l.canvas.width, l.canvas.height);
    backup.getContext("2d").drawImage(l.canvas, 0, 0);
    gesture.current = {
      kind: tool === "move" ? "layer-move" : "draw",
      tool,
      layerId: l.id,
      start: p,
      last: p,
      x: l.x,
      y: l.y,
      backup,
    };
    if (tool === "brush" || tool === "eraser") {
      const ctx = l.canvas.getContext("2d");
      drawWith(ctx, l, () => {
        ctx.globalCompositeOperation =
          tool === "eraser" ? "destination-out" : "source-over";
        ctx.beginPath();
        ctx.arc(p.x - l.x, p.y - l.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      });
      render();
    }
  }
  function resizedRect(original, handle, dx, dy, locked = false) {
    if (handle === "move")
      return { ...original, x: original.x + dx, y: original.y + dy };
    let w =
        original.w +
        (handle.includes("e") ? dx : handle.includes("w") ? -dx : 0),
      h =
        original.h +
        (handle.includes("s") ? dy : handle.includes("n") ? -dy : 0);
    w = Math.max(1, w);
    h = Math.max(1, h);
    if (locked) {
      if (
        handle === "n" ||
        handle === "s" ||
        Math.abs(h / original.h - 1) > Math.abs(w / original.w - 1)
      )
        w = (h * original.w) / original.h;
      else h = (w * original.h) / original.w;
    }
    return {
      x: original.x + (handle.includes("w") ? original.w - w : 0),
      y: original.y + (handle.includes("n") ? original.h - h : 0),
      w,
      h,
    };
  }
  function move(e) {
    const g = gesture.current;
    if (!g) return;
    const p = point(e, false),
      dx = p.x - g.start.x,
      dy = p.y - g.start.y,
      d = doc.current;
    if (g.kind === "transform") {
      const t = g.original,
        radians = (t.angle * Math.PI) / 180,
        co = Math.cos(radians),
        si = Math.sin(radians);
      if (g.handle === "move") {
        setTransformDraft({ ...t, x: t.x + dx, y: t.y + dy });
        return;
      }
      const r = resizedRect(
        { x: 0, y: 0, w: t.w, h: t.h },
        g.handle,
        co * dx + si * dy,
        -si * dx + co * dy,
        keepAspect !== e.shiftKey,
      );
      const cx = r.x + r.w / 2 - t.w / 2,
        cy = r.y + r.h / 2 - t.h / 2;
      setTransformDraft({
        ...t,
        x: t.x + t.w / 2 + co * cx - si * cy - r.w / 2,
        y: t.y + t.h / 2 + si * cx + co * cy - r.h / 2,
        w: Math.max(1, Math.min(6000, Math.round(r.w))),
        h: Math.max(1, Math.min(6000, Math.round(r.h))),
      });
      return;
    }
    if (g.kind === "rect-handle") {
      const r = boundedRect(resizedRect(g.original, g.handle, dx, dy));
      setMask(rectangleMask(d.width, d.height, r), "replace", null, r);
      return;
    }
    if (g.kind === "selection-move") {
      const ix = Math.round(dx),
        iy = Math.round(dy);
      setSelection(
        selectionFromMask(
          translateMask(g.original.mask, d.width, d.height, ix, iy),
          d.width,
          d.height,
          g.original.rect
            ? {
                ...g.original.rect,
                x: g.original.rect.x + ix,
                y: g.original.rect.y + iy,
              }
            : null,
        ),
      );
      return;
    }
    if (g.kind === "select") {
      g.moved = true;
      let end = point(e);
      if (squareSelection) {
        const side = Math.min(
          Math.abs(end.x - g.start.x),
          Math.abs(end.y - g.start.y),
        );
        end = {
          x: g.start.x + Math.sign(end.x - g.start.x) * side,
          y: g.start.y + Math.sign(end.y - g.start.y) * side,
        };
      }
      const r = boundedRect(box(g.start, end));
      setMask(rectangleMask(d.width, d.height, r, feather), g.mode, g.base, r);
      return;
    }
    const l = d.layers.find((l) => l.id === g.layerId);
    if (!l) return;
    if (g.kind === "layer-move") {
      l.x = Math.round(g.x + dx);
      l.y = Math.round(g.y + dy);
      refresh();
      return;
    }
    const ctx = l.canvas.getContext("2d"),
      t = g.tool;
    if (t === "rectangle" || t === "ellipse") {
      ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      ctx.drawImage(g.backup, 0, 0);
    }
    drawWith(ctx, l, () => {
      ctx.beginPath();
      if (t === "brush" || t === "eraser") {
        ctx.globalCompositeOperation =
          t === "eraser" ? "destination-out" : "source-over";
        ctx.moveTo(g.last.x - l.x, g.last.y - l.y);
        ctx.lineTo(p.x - l.x, p.y - l.y);
        ctx.stroke();
      } else {
        const b = box(g.start, p);
        if (t === "rectangle") ctx.rect(b.x - l.x, b.y - l.y, b.w, b.h);
        if (t === "ellipse")
          ctx.ellipse(
            b.x - l.x + b.w / 2,
            b.y - l.y + b.h / 2,
            b.w / 2,
            b.h / 2,
            0,
            0,
            Math.PI * 2,
          );
        fill ? ctx.fill() : ctx.stroke();
      }
    });
    g.last = p;
    render();
  }
  function end() {
    if (gesture.current) {
      if (
        gesture.current.kind === "select" &&
        !gesture.current.moved &&
        gesture.current.mode === "replace"
      )
        setMask(new Uint8ClampedArray(doc.current.width * doc.current.height));
      gesture.current = null;
      refresh();
    }
  }
  function crop() {
    if (!selection?.count || doc.current.layers.some((l) => l.locked)) return;
    const b = selection;
    mutate(() => {
      doc.current.layers = doc.current.layers.map((l) => {
        const c = makeCanvas(b.w, b.h);
        c.getContext("2d").drawImage(l.canvas, l.x - b.x, l.y - b.y);
        return { ...l, canvas: c, x: 0, y: 0 };
      });
      doc.current.width = b.w;
      doc.current.height = b.h;
    });
    setSelection(null);
    fit();
  }
  function applyFilter(filter) {
    const l = currentLayer();
    if (!canEdit(l)) return;
    mutate(() => {
      const c = makeCanvas(l.canvas.width, l.canvas.height),
        ctx = c.getContext("2d");
      ctx.filter = filter;
      ctx.drawImage(l.canvas, 0, 0);
      const out = l.canvas.getContext("2d");
      drawWith(out, l, () => {
        out.clearRect(0, 0, l.canvas.width, l.canvas.height);
        out.drawImage(c, 0, 0);
      });
    });
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  }
  function applyToScanner() {
    const c = composite(false),
      d = doc.current,
      src = c.toDataURL("image/png");
    if (d.sourceId && pages.some((p) => p.id === d.sourceId))
      useScannerStore
        .getState()
        .updatePage(d.sourceId, { src, width: d.width, height: d.height });
    else {
      const id = crypto.randomUUID();
      useScannerStore.getState().addPage({
        id,
        name: d.name,
        src,
        originalSrc: src,
        width: d.width,
        height: d.height,
        originalWidth: d.width,
        originalHeight: d.height,
      });
      d.sourceId = id;
    }
    useScannerStore.setState({
      activePageId: d.sourceId,
      paintHistory: [],
      enhanceHistory: [],
      cropMode: false,
      cropPoints: null,
    });
    useScannerStore.getState().saveToDB();
    showToast("Finished editing. Your image is ready in Simple.");
    refresh();
  }
  function finishEditing() {
    if (busy || !doc.current.layers.length || gesture.current) return;
    if (transformDraft) {
      if (
        !transformed ||
        transformDraft.layerId !== doc.current.activeId ||
        !canEdit()
      ) {
        showToast(
          "Apply or cancel the current transform before finishing.",
          true,
        );
        return;
      }
      commitTransform();
    }
    try {
      applyToScanner();
      setSelection(null);
      colorSample.current = null;
      onFinish?.();
    } catch (error) {
      showToast(`Could not finish editing: ${error.message}`, true);
    }
  }
  function downloadProject() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            type: "simple-editor-project",
            version: 2,
            document: snapshot(),
          }),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.current.name}.simple.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function openProject(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTransformDraft(null);
    setBusy(true);
    try {
      if (file.size > 64 * 1024 * 1024)
        throw new Error("Project exceeds 64 MB.");
      const data = JSON.parse(await file.text()),
        d = data.document;
      if (
        data.type !== "simple-editor-project" ||
        ![1, 2].includes(data.version) ||
        !d ||
        !Number.isInteger(d.width) ||
        !Number.isInteger(d.height) ||
        d.width < 1 ||
        d.height < 1 ||
        d.width > 6000 ||
        d.height > 6000 ||
        d.width * d.height > 16000000 ||
        !Array.isArray(d.layers) ||
        d.layers.length < 1 ||
        d.layers.length > 40
      )
        throw new Error("Invalid editor project.");
      for (const l of d.layers)
        if (
          !/^data:image\/png;base64,/.test(l.src) ||
          typeof l.name !== "string" ||
          !Number.isFinite(l.x) ||
          !Number.isFinite(l.y) ||
          !Number.isFinite(l.opacity) ||
          l.opacity < 0 ||
          l.opacity > 100 ||
          ![
            "source-over",
            "multiply",
            "screen",
            "overlay",
            "darken",
            "lighten",
          ].includes(l.blend)
        )
          throw new Error("Invalid layer in project.");
      const ids = new Set(d.layers.map((l) => l.id));
      if (ids.size !== d.layers.length || !ids.has(d.activeId))
        throw new Error("Invalid layer IDs.");
      checkpoint();
      await restore({ ...d, sourceId: null });
      fit(d.width, d.height);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  const d = doc.current,
    layer = currentLayer(),
    hasDocument = d.layers.length > 0;
  const overlay = useMemo(
    () =>
      selection
        ? overlayCanvas(selection, d.width, d.height).toDataURL()
        : null,
    [selection, d.width, d.height],
  );
  return (
    <section
      className="ae"
      hidden={!visible}
      aria-label="Advanced image editor"
      aria-busy={busy}
    >
      <div className="ae-topbar">
        <div className="ae-file">
          <span className="ae-kicker">WORKSPACE</span>
          <strong>{d.name}</strong>
        </div>
        <div className="ae-top-actions">
          <IconButton
            icon={Undo2}
            label="Undo"
            disabled={busy || !history.current.past.length}
            onClick={() => travel(false)}
          />
          <IconButton
            icon={Redo2}
            label="Redo"
            disabled={busy || !history.current.future.length}
            onClick={() => travel(true)}
          />
          <span className="ae-divider" />
          <button onClick={() => uploadRef.current.click()} disabled={busy}>
            <Upload size={14} /> Add image
          </button>
          <button
            onClick={() => restartDialogRef.current?.showModal()}
            disabled={busy || !hasDocument}
            title="Clear the advanced workspace and start over"
          >
            Restart
          </button>
          <button
            className="ae-primary"
            onClick={finishEditing}
            disabled={
              busy || !hasDocument || (!!transformDraft && !transformed)
            }
            title="Apply the current transform, finish this image, and return to Simple"
          >
            <Check size={14} /> Finish editing
          </button>
          <button
            disabled={!hasDocument || busy || !!transformDraft}
            onClick={() => {
              let c = composite(false);
              if (format === "jpg") {
                const flat = makeCanvas(c.width, c.height);
                const ctx = flat.getContext("2d");
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(c, 0, 0);
                c = flat;
              }
              exportSinglePage(c, d.name, format);
            }}
          >
            <Download size={14} /> Export
          </button>
          <select
            aria-label="Export format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>
      <div className="ae-body">
        <nav className="ae-tools" aria-label="Editor tools">
          {toolList.map(([id, Icon, label]) => (
            <IconButton
              key={id}
              icon={Icon}
              label={label}
              aria-pressed={tool === id}
              onClick={() => chooseTool(id)}
            />
          ))}
          <span className="ae-tool-divider" />
          <input
            type="color"
            aria-label="Foreground color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </nav>
        <main id="advanced-content" className="ae-center">
          <div className="ae-options">
            <strong>{toolList.find((t) => t[0] === tool)?.[2]}</strong>
            <span className="ae-divider" />
            {["brush", "eraser", "rectangle", "ellipse"].includes(tool) && (
              <>
                <label>
                  Size{" "}
                  <input
                    aria-label="Brush size"
                    type="number"
                    min="1"
                    max="300"
                    value={size}
                    onChange={(e) =>
                      setSize(
                        Math.max(1, Math.min(300, Number(e.target.value) || 1)),
                      )
                    }
                  />{" "}
                  px
                </label>
                {["rectangle", "ellipse"].includes(tool) && (
                  <label>
                    <input
                      type="checkbox"
                      checked={fill}
                      onChange={(e) => setFill(e.target.checked)}
                    />{" "}
                    Fill
                  </label>
                )}
              </>
            )}
            {selection && (
              <>
                <span>{selection.count.toLocaleString()} px selected</span>
                <button onClick={crop} disabled={!selection.count}>
                  Crop to selection
                </button>
                <button onClick={() => changeSelection(null)}>Deselect</button>
              </>
            )}
            <span className="ae-hint">{hints[tool]}</span>
          </div>
          <div className="ae-stage" ref={stageRef}>
            {hasDocument ? (
              <div
                className="ae-paper"
                style={{
                  width: (d.width * zoom) / 100,
                  height: (d.height * zoom) / 100,
                }}
              >
                <canvas
                  ref={canvasRef}
                  aria-label="Image editing canvas"
                  onPointerDown={start}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  style={{ cursor: tool === "move" ? "move" : "crosshair" }}
                />
                {overlay && (
                  <img
                    className="ae-mask-overlay"
                    src={overlay}
                    alt="Selection mask"
                  />
                )}
                {selection?.rect && tool === "select" && (
                  <div
                    className="ae-selection ae-editable-selection"
                    style={{
                      left: (selection.rect.x * zoom) / 100,
                      top: (selection.rect.y * zoom) / 100,
                      width: (selection.rect.w * zoom) / 100,
                      height: (selection.rect.h * zoom) / 100,
                    }}
                    onPointerDown={(e) => {
                      if (
                        !e.shiftKey &&
                        !e.ctrlKey &&
                        !e.metaKey &&
                        selectionMode === "replace"
                      )
                        handleStart(e, "rect");
                      else start(e);
                    }}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                  >
                    {handles.map((handle) => (
                      <button
                        key={handle}
                        className={`ae-handle ae-handle-${handle}`}
                        aria-label={`Resize selection ${handle}`}
                        onPointerDown={(e) => handleStart(e, "rect", handle)}
                      />
                    ))}
                  </div>
                )}
                {tool === "scale" && transformDraft && (
                  <div
                    className="ae-transform-box"
                    style={{
                      left: (transformDraft.x * zoom) / 100,
                      top: (transformDraft.y * zoom) / 100,
                      width: (transformDraft.w * zoom) / 100,
                      height: (transformDraft.h * zoom) / 100,
                      transform: `rotate(${transformDraft.angle}deg)`,
                    }}
                    onPointerDown={(e) => handleStart(e, "transform")}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                  >
                    {handles.map((handle) => (
                      <button
                        key={handle}
                        className={`ae-handle ae-handle-${handle}`}
                        aria-label={`Scale layer ${handle}`}
                        onPointerDown={(e) =>
                          handleStart(e, "transform", handle)
                        }
                      />
                    ))}
                    <span className="ae-transform-center">+</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ae-empty">
                <div className="ae-empty-icon">
                  <Layers size={28} strokeWidth={1.25} />
                </div>
                <h2>A little more possibility.</h2>
                <p>
                  Start with a scanner page, open an image,
                  <br />
                  or create a blank canvas.
                </p>
                <button
                  className="ae-primary"
                  onClick={() => uploadRef.current.click()}
                >
                  <ImagePlus size={16} /> Open image
                </button>
                <button onClick={blank}>Create blank canvas</button>
              </div>
            )}
          </div>
          <footer className="ae-status">
            <span>
              {hasDocument
                ? `${d.width} × ${d.height} px · ${d.layers.length} layers`
                : "No image open"}
              <span className="ae-status-note"> · Local editing</span>
            </span>
            <div>
              <button onClick={() => fit()}>Fit</button>
              <button
                aria-label="Editor zoom out"
                onClick={() => setZoom((z) => Math.max(5, z - 10))}
              >
                −
              </button>
              <span>{zoom}%</span>
              <button
                aria-label="Editor zoom in"
                onClick={() => setZoom((z) => Math.min(300, z + 10))}
              >
                +
              </button>
            </div>
          </footer>
        </main>
        <aside className="ae-inspector">
          {/* Contextual controls for the four core tools. */}
          {tool === "move" && (
            <section>
              <h3>
                MOVE TOOL <span>M</span>
              </h3>
              <label className="ae-field">
                Move
                <select
                  aria-label="Move target"
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                >
                  <option value="layer">Active layer</option>
                  <option value="pixels">Selected pixels</option>
                  <option value="selection">Selection outline</option>
                </select>
              </label>
              {moveTarget === "layer" && (
                <label className="ae-check">
                  <input
                    type="checkbox"
                    checked={autoPick}
                    onChange={(e) => setAutoPick(e.target.checked)}
                  />{" "}
                  Pick a layer under the pointer
                </label>
              )}
              {layer && (
                <div className="ae-row">
                  {["x", "y"].map((axis) => (
                    <label key={axis}>
                      {axis.toUpperCase()}
                      <input
                        type="number"
                        aria-label={`Layer ${axis.toUpperCase()}`}
                        value={layer[axis]}
                        disabled={layer.locked || busy}
                        onChange={(e) =>
                          mutate(() => {
                            layer[axis] = Math.round(
                              Number(e.target.value) || 0,
                            );
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              <p className="ae-muted">
                Arrow keys nudge 1 px; Shift nudges 25 px. Selected pixels are
                lifted into a new layer.
              </p>
            </section>
          )}
          {["select", "bycolor", "crop"].includes(tool) && (
            <section>
              <h3>
                {tool === "bycolor" ? "SELECT BY COLOR" : "RECTANGLE SELECT"}
                <span>{tool === "bycolor" ? "Shift O" : "R"}</span>
              </h3>
              <label className="ae-field">
                Selection mode
                <select
                  aria-label="Selection mode"
                  value={selectionMode}
                  onChange={(e) => {
                    colorSample.current = null;
                    setSelectionMode(e.target.value);
                  }}
                >
                  <option value="replace">Replace</option>
                  <option value="add">Add</option>
                  <option value="subtract">Subtract</option>
                  <option value="intersect">Intersect</option>
                </select>
              </label>
              {tool !== "bycolor" && (
                <>
                  <label className="ae-check">
                    <input
                      type="checkbox"
                      checked={squareSelection}
                      onChange={(e) => setSquareSelection(e.target.checked)}
                    />{" "}
                    Fixed aspect ratio 1:1
                  </label>
                  <label className="ae-range">
                    <span>
                      Feather new selection<output>{feather} px</output>
                    </span>
                    <input
                      type="range"
                      aria-label="Feather selection"
                      min="0"
                      max="30"
                      value={feather}
                      onChange={(e) => setFeather(Number(e.target.value))}
                    />
                  </label>
                  {selection?.rect && (
                    <div className="ae-coordinate-grid">
                      {[
                        ["x", "X"],
                        ["y", "Y"],
                        ["w", "Width"],
                        ["h", "Height"],
                      ].map(([field, label]) => (
                        <label key={field}>
                          {label}
                          <input
                            type="number"
                            aria-label={`Selection ${label}`}
                            value={selection.rect[field]}
                            onChange={(e) => editRect(field, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tool === "bycolor" && (
                <>
                  <label className="ae-range">
                    <span>
                      Threshold<output>{threshold} / 255</output>
                    </span>
                    <input
                      type="range"
                      aria-label="Color threshold"
                      min="0"
                      max="255"
                      value={threshold}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setThreshold(value);
                        updateColorSelection({ threshold: value });
                      }}
                    />
                  </label>
                  <label className="ae-field">
                    Compare
                    <select
                      aria-label="Compare color by"
                      value={criterion}
                      onChange={(e) => {
                        setCriterion(e.target.value);
                        updateColorSelection({ criterion: e.target.value });
                      }}
                    >
                      {[
                        ["rgb", "Composite RGB"],
                        ["red", "Red"],
                        ["green", "Green"],
                        ["blue", "Blue"],
                        ["alpha", "Alpha"],
                        ["brightness", "Brightness"],
                      ].map(([v, label]) => (
                        <option value={v} key={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ae-check">
                    <input
                      type="checkbox"
                      checked={sampleMerged}
                      onChange={(e) => {
                        setSampleMerged(e.target.checked);
                        colorSample.current = null;
                      }}
                    />{" "}
                    Sample all visible layers
                  </label>
                  <label className="ae-check">
                    <input
                      type="checkbox"
                      checked={selectTransparent}
                      onChange={(e) => {
                        setSelectTransparent(e.target.checked);
                        updateColorSelection({ transparent: e.target.checked });
                      }}
                    />{" "}
                    Select transparent areas
                  </label>
                  <label className="ae-check">
                    <input
                      type="checkbox"
                      checked={antialias}
                      onChange={(e) => {
                        setAntialias(e.target.checked);
                        updateColorSelection({ antialias: e.target.checked });
                      }}
                    />{" "}
                    Antialias edges
                  </label>
                  <p className="ae-muted">
                    Click a color, then adjust the threshold. Matches are
                    selected everywhere, even in disconnected areas.
                  </p>
                </>
              )}
            </section>
          )}
          {tool === "scale" && (
            <section>
              <h3>
                SCALE · ROTATE · FLIP<span>Shift S</span>
              </h3>
              {transformDraft ? (
                <>
                  <div className="ae-coordinate-grid">
                    {[
                      ["w", "Width"],
                      ["h", "Height"],
                      ["x", "X"],
                      ["y", "Y"],
                    ].map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <input
                          type="number"
                          aria-label={`Transform ${label}`}
                          value={Math.round(transformDraft[field])}
                          onChange={(e) =>
                            updateTransform(field, Number(e.target.value) || 0)
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="ae-check">
                    <input
                      type="checkbox"
                      checked={keepAspect}
                      onChange={(e) => setKeepAspect(e.target.checked)}
                    />{" "}
                    Keep aspect ratio
                  </label>
                  <label className="ae-field">
                    Rotation (degrees)
                    <input
                      type="number"
                      aria-label="Rotation degrees"
                      min="-360"
                      max="360"
                      value={transformDraft.angle}
                      onChange={(e) =>
                        updateTransform(
                          "angle",
                          Math.max(
                            -360,
                            Math.min(360, Number(e.target.value) || 0),
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="ae-row">
                    <button
                      onClick={() =>
                        updateTransform(
                          "angle",
                          (transformDraft.angle - 90) % 360,
                        )
                      }
                    >
                      −90°
                    </button>
                    <button
                      onClick={() =>
                        updateTransform(
                          "angle",
                          (transformDraft.angle + 90) % 360,
                        )
                      }
                    >
                      +90°
                    </button>
                  </div>
                  <div className="ae-row">
                    <button
                      aria-pressed={transformDraft.flipX}
                      onClick={() =>
                        updateTransform("flipX", !transformDraft.flipX)
                      }
                    >
                      Flip horizontal
                    </button>
                    <button
                      aria-pressed={transformDraft.flipY}
                      onClick={() =>
                        updateTransform("flipY", !transformDraft.flipY)
                      }
                    >
                      Flip vertical
                    </button>
                  </div>
                  <label className="ae-field">
                    Interpolation
                    <select
                      aria-label="Scale interpolation"
                      value={smoothScale ? "smooth" : "nearest"}
                      onChange={(e) =>
                        setSmoothScale(e.target.value === "smooth")
                      }
                    >
                      <option value="smooth">
                        High-quality browser smoothing
                      </option>
                      <option value="nearest">
                        Nearest neighbor (pixel art)
                      </option>
                    </select>
                  </label>
                  {!transformed && (
                    <p role="alert">
                      Use dimensions up to 6,000 px and 16 megapixels.
                    </p>
                  )}
                  <div className="ae-row">
                    <button
                      className="ae-primary"
                      onClick={commitTransform}
                      disabled={!transformed || busy}
                    >
                      Apply transform
                    </button>
                    <button onClick={() => setTransformDraft(null)}>
                      Cancel
                    </button>
                  </div>
                  <p className="ae-muted">
                    Preview uses the original pixels until you apply. Enter
                    applies; Escape cancels. Canvas size stays unchanged.
                  </p>
                </>
              ) : (
                <button
                  className="ae-wide"
                  onClick={beginTransform}
                  disabled={!layer || layer.locked}
                >
                  Transform active layer
                </button>
              )}
            </section>
          )}
          {hasDocument && !transformDraft && (
            <section className="ae-selection-actions">
              <h3>
                SELECTION
                <span>
                  {selection
                    ? `${selection.count.toLocaleString()} px`
                    : "None"}
                </span>
              </h3>
              <div className="ae-row">
                <button
                  onClick={() =>
                    changeSelection(
                      selectionFromMask(
                        new Uint8ClampedArray(d.width * d.height).fill(255),
                        d.width,
                        d.height,
                      ),
                    )
                  }
                >
                  All
                </button>
                <button
                  disabled={!selection}
                  onClick={() => changeSelection(null)}
                >
                  None
                </button>
                <button
                  disabled={!selection}
                  onClick={() =>
                    changeSelection(
                      selectionFromMask(
                        selection.mask.map((v) => 255 - v),
                        d.width,
                        d.height,
                      ),
                    )
                  }
                >
                  Invert
                </button>
              </div>
              <div className="ae-row">
                <button
                  onClick={() => copyPixels(false)}
                  disabled={!layer || (selection && !selection.count)}
                >
                  Copy
                </button>
                <button
                  onClick={() => copyPixels(true)}
                  disabled={
                    !layer ||
                    layer.locked ||
                    layer.alphaLocked ||
                    (selection && !selection.count)
                  }
                >
                  Cut
                </button>
                <button
                  onClick={pastePixels}
                  disabled={!hasClipboard || d.layers.length >= 40}
                >
                  Paste
                </button>
              </div>
              <div className="ae-row">
                <button
                  onClick={clearPixels}
                  disabled={
                    !layer ||
                    layer.locked ||
                    layer.alphaLocked ||
                    (selection && !selection.count)
                  }
                >
                  Delete pixels
                </button>
                <button
                  onClick={fillPixels}
                  disabled={
                    !layer || layer.locked || (selection && !selection.count)
                  }
                >
                  Fill with color
                </button>
              </div>
              <p className="ae-muted">
                Delete makes pixels transparent. PNG and editable projects
                preserve transparency; JPG uses white.
              </p>
            </section>
          )}

          <details className="ae-extra">
            <summary>Document</summary>
            <section>
              <div className="ae-row">
                <label>
                  Width
                  <input
                    aria-label="New canvas width"
                    type="number"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.value)}
                  />
                </label>
                <label>
                  Height
                  <input
                    aria-label="New canvas height"
                    type="number"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                  />
                </label>
              </div>
              <label className="ae-check">
                <input
                  type="checkbox"
                  checked={transparentCanvas}
                  onChange={(e) => setTransparentCanvas(e.target.checked)}
                />{" "}
                Transparent background
              </label>
              <div className="ae-row">
                <button onClick={blank} disabled={busy}>
                  New canvas
                </button>
                <button
                  onClick={() => projectRef.current.click()}
                  disabled={busy}
                >
                  Open project
                </button>
              </div>
              {pages.length > 0 && (
                <select
                  aria-label="Open scanner page"
                  value=""
                  disabled={busy}
                  onChange={(e) => {
                    const p = pages.find((p) => p.id === e.target.value);
                    if (p) openPage(p);
                  }}
                >
                  <option value="">Open a scanner page…</option>
                  {pages.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </section>
          </details>
          {tool === "text" && (
            <section>
              <h3>TEXT</h3>
              <textarea
                aria-label="Text content"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <label className="ae-row">
                Font size
                <input
                  aria-label="Font size"
                  type="number"
                  min="6"
                  max="600"
                  value={fontSize}
                  onChange={(e) =>
                    setFontSize(
                      Math.max(6, Math.min(600, Number(e.target.value) || 6)),
                    )
                  }
                />
              </label>
              <p className="ae-muted">
                Click the canvas to place a new text layer.
              </p>
            </section>
          )}
          <details className="ae-extra">
            <summary>Adjustments</summary>
            <section>
              {[
                ["Brightness", brightness, setBrightness],
                ["Contrast", contrast, setContrast],
                ["Saturation", saturation, setSaturation],
              ].map(([label, value, set]) => (
                <label className="ae-range" key={label}>
                  <span>
                    {label}
                    <output>{value}%</output>
                  </span>
                  <input
                    aria-label={label}
                    type="range"
                    min="0"
                    max="200"
                    value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    disabled={!layer || busy}
                  />
                </label>
              ))}
              <button
                className="ae-wide"
                disabled={!layer || busy}
                onClick={() =>
                  applyFilter(
                    `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  )
                }
              >
                Apply adjustments
              </button>
              <div className="ae-row">
                <button
                  disabled={!layer || busy}
                  onClick={() => applyFilter("grayscale(100%)")}
                >
                  Grayscale
                </button>
                <button
                  disabled={!layer || busy}
                  onClick={() => applyFilter("invert(100%)")}
                >
                  Invert
                </button>
                <button
                  disabled={!layer || busy}
                  onClick={() => applyFilter("blur(3px)")}
                >
                  Blur
                </button>
              </div>
            </section>
          </details>
          <section className="ae-layers">
            <h3>
              LAYERS <span>{d.layers.length}</span>
            </h3>
            {layer && (
              <>
                <div className="ae-row">
                  <select
                    aria-label="Layer blend mode"
                    value={layer.blend}
                    disabled={busy}
                    onChange={(e) =>
                      mutate(() => {
                        layer.blend = e.target.value;
                      })
                    }
                  >
                    {[
                      ["source-over", "Normal"],
                      ["multiply", "Multiply"],
                      ["screen", "Screen"],
                      ["overlay", "Overlay"],
                      ["darken", "Darken"],
                      ["lighten", "Lighten"],
                    ].map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="ae-opacity">
                    Opacity
                    <input
                      aria-label="Layer opacity"
                      type="number"
                      min="0"
                      max="100"
                      value={layer.opacity}
                      disabled={busy}
                      onChange={(e) =>
                        mutate(() => {
                          layer.opacity = Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0),
                          );
                        })
                      }
                    />
                  </label>
                </div>
              </>
            )}
            <div className="ae-layer-list">
              {[...d.layers].reverse().map((l) => (
                <div
                  className={`ae-layer ${l.id === d.activeId ? "selected" : ""}`}
                  key={l.id}
                >
                  <IconButton
                    icon={l.visible ? Eye : EyeOff}
                    label={`${l.visible ? "Hide" : "Show"} ${l.name}`}
                    disabled={busy}
                    onClick={() =>
                      mutate(() => {
                        l.visible = !l.visible;
                      })
                    }
                  />
                  <button
                    className="ae-layer-select"
                    aria-label={`Select layer ${l.name}`}
                    aria-pressed={l.id === d.activeId}
                    onClick={() => {
                      d.activeId = l.id;
                      setTransformDraft(null);
                      colorSample.current = null;
                      refresh();
                    }}
                  >
                    <span className="ae-layer-thumb">
                      <LayerThumbnail layer={l} version={version} />
                    </span>
                    <span>{l.name}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="ae-layer-actions">
              <IconButton
                icon={Plus}
                label="Add transparent layer"
                disabled={!hasDocument || busy || d.layers.length >= 40}
                onClick={() =>
                  mutate(() => {
                    const l = freshLayer(
                      `Layer ${d.layers.length + 1}`,
                      makeCanvas(d.width, d.height),
                    );
                    d.layers.push(l);
                    d.activeId = l.id;
                  })
                }
              />
              <IconButton
                icon={Copy}
                label="Duplicate layer"
                disabled={!layer || busy || d.layers.length >= 40}
                onClick={() =>
                  mutate(() => {
                    const c = makeCanvas(
                      layer.canvas.width,
                      layer.canvas.height,
                    );
                    c.getContext("2d").drawImage(layer.canvas, 0, 0);
                    const l = {
                      ...layer,
                      id: crypto.randomUUID(),
                      canvas: c,
                      name: `${layer.name} copy`,
                    };
                    d.layers.splice(d.layers.indexOf(layer) + 1, 0, l);
                    d.activeId = l.id;
                  })
                }
              />
              <IconButton
                icon={ArrowUp}
                label="Raise layer"
                disabled={
                  !layer ||
                  busy ||
                  d.layers.indexOf(layer) === d.layers.length - 1
                }
                onClick={() =>
                  mutate(() => {
                    const i = d.layers.indexOf(layer);
                    [d.layers[i], d.layers[i + 1]] = [
                      d.layers[i + 1],
                      d.layers[i],
                    ];
                  })
                }
              />
              <IconButton
                icon={ArrowDown}
                label="Lower layer"
                disabled={!layer || busy || d.layers.indexOf(layer) === 0}
                onClick={() =>
                  mutate(() => {
                    const i = d.layers.indexOf(layer);
                    [d.layers[i], d.layers[i - 1]] = [
                      d.layers[i - 1],
                      d.layers[i],
                    ];
                  })
                }
              />
              <IconButton
                icon={Trash2}
                label="Delete layer"
                disabled={!layer || busy || d.layers.length < 2 || layer.locked}
                onClick={() =>
                  mutate(() => {
                    d.layers = d.layers.filter((l) => l.id !== layer.id);
                    d.activeId = d.layers[d.layers.length - 1].id;
                  })
                }
              />
            </div>
            {layer && (
              <div className="ae-layer-locks">
                <label className="ae-check">
                  <input
                    type="checkbox"
                    aria-label="Lock layer"
                    checked={!!layer.locked}
                    onChange={(e) => {
                      setTransformDraft(null);
                      mutate(() => {
                        layer.locked = e.target.checked;
                      });
                    }}
                  />{" "}
                  Lock layer
                </label>
                <label className="ae-check">
                  <input
                    type="checkbox"
                    aria-label="Lock alpha"
                    checked={!!layer.alphaLocked}
                    onChange={(e) =>
                      mutate(() => {
                        layer.alphaLocked = e.target.checked;
                      })
                    }
                  />{" "}
                  Lock alpha
                </label>
              </div>
            )}
            {layer && (
              <p className="ae-muted">
                RGBA · Transparency enabled on every layer
              </p>
            )}
            {layer && (
              <label className="ae-rename">
                Layer name
                <input
                  aria-label="Layer name"
                  key={layer.id + layer.name}
                  defaultValue={layer.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== layer.name)
                      mutate(() => {
                        layer.name = e.target.value.trim();
                      });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </label>
            )}
          </section>
          <section className="ae-project">
            <button
              className="ae-wide"
              onClick={downloadProject}
              disabled={!hasDocument || busy || !!transformDraft}
            >
              <Download size={14} /> Save editable project
            </button>
            <p className="ae-muted">
              Keep your layers for later. Scanner receives a flattened copy when
              you apply.
            </p>
          </section>
        </aside>
      </div>
      <input
        type="file"
        ref={uploadRef}
        accept="image/*"
        hidden
        onChange={importLayer}
      />
      <input
        type="file"
        ref={projectRef}
        accept=".json"
        hidden
        onChange={openProject}
      />
      <dialog
        ref={restartDialogRef}
        className="ae-restart-dialog"
        aria-labelledby="restart-editor-title"
        aria-describedby="restart-editor-description"
      >
        <h2 id="restart-editor-title">Restart the editor?</h2>
        <p id="restart-editor-description">
          This clears the current advanced workspace, including layers,
          selections, and undo history. Save an editable project first if you
          want to keep it. Your scanner pages and exported files stay intact.
        </p>
        <div className="ae-dialog-actions">
          <button autoFocus onClick={() => restartDialogRef.current?.close()}>
            Keep editing
          </button>
          <button
            className="ae-primary"
            onClick={() => {
              restartDialogRef.current?.close();
              onRestart?.();
            }}
          >
            Restart editor
          </button>
        </div>
      </dialog>
    </section>
  );
}
