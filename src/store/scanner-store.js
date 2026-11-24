import { create } from 'zustand';
import { storage } from '../lib/page-storage';
import { showToast } from '../lib/utils';
import { pageImage } from '../lib/page-image';
import { pushStep } from '../lib/page-history';
import { fromRecord, toRecord } from '../lib/page-record';

// What was last written to IndexedDB, per page id: { page, order }.
const saved = new Map();

// State that belongs to the page being worked on; it starts over whenever
// another page (or none) becomes active.
const freshPageState = { cropMode: false, cropPoints: null, history: [], cloneSource: null, pickingCloneSource: false };

export const useScannerStore = create((set, get) => ({
  // A page is { id, name, createdAt, blob, width, height, paper, original },
  // where `original` is the picture as uploaded ({ blob, width, height, paper }).
  pages: [],
  activePageId: null,
  zoom: 60,
  isProcessing: false,
  processingMessage: 'Processing...',
  rightPanelOpen: true,
  activeTool: 'enhance',
  // Earlier pictures of the active page, oldest first: one undo stack for
  // every kind of edit (scan, fix, crop, rotate, paint, reset).
  history: [],
  cropMode: false,
  cropPoints: null,
  brushColor: '#000000',
  brushSize: 10,
  paintMode: 'brush',
  cloneSource: null,
  pickingCloneSource: false,

  dialog: { open: false, title: '', description: '', onConfirm: null, variant: 'default' },

  // Computed
  activePage: () => {
    const { pages, activePageId } = get();
    return pages.find((p) => p.id === activePageId) || null;
  },

  // Setters
  setZoom: (fn) => set((s) => ({ zoom: typeof fn === 'function' ? fn(s.zoom) : fn })),
  setActivePageId: (id) => set({ activePageId: id, ...freshPageState }),
  setProcessing: (isProcessing, msg) => set({ isProcessing, ...(msg ? { processingMessage: msg } : {}) }),
  setActiveTool: (tool) => {
    set((s) => ({
      activeTool: tool,
      cropMode: tool === 'edit' ? s.cropMode : false,
      cropPoints: tool === 'edit' ? s.cropPoints : null,
      pickingCloneSource: false,
      rightPanelOpen: true,
    }));
  },
  setCropMode: (v) => set({ cropMode: v, ...(v ? {} : { cropPoints: null }) }),
  setCropPoints: (fn) => set((s) => ({ cropPoints: typeof fn === 'function' ? fn(s.cropPoints) : fn })),
  setBrushColor: (c) => set({ brushColor: c }),
  setBrushSize: (s) => set({ brushSize: s }),
  setPaintMode: (m) => set({ paintMode: m, pickingCloneSource: false }),
  setCloneSource: (p) => set({ cloneSource: p, pickingCloneSource: false }),
  setPickingCloneSource: (v) => set({ pickingCloneSource: v }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
  setDialog: (d) => set({ dialog: d }),

  // Page mutations
  addPage: (page) =>
    set((s) => ({
      pages: [...s.pages, page],
      activePageId: s.activePageId || page.id,
    })),

  // Gives a page a new picture ({ blob, width, height, paper }). On the active
  // page the previous picture becomes an undo step.
  commitImage: (id, image) =>
    set((s) => {
      const page = s.pages.find((p) => p.id === id);
      if (!page) return {};
      return {
        pages: s.pages.map((p) => (p.id === id ? { ...p, ...pageImage(image) } : p)),
        history: id === s.activePageId ? pushStep(s.history, pageImage(page)) : s.history,
      };
    }),

  // Returns the active page to its previous picture.
  undo: () =>
    set((s) => {
      const previous = s.history[s.history.length - 1];
      if (!previous) return {};
      return {
        pages: s.pages.map((p) => (p.id === s.activePageId ? { ...p, ...previous } : p)),
        history: s.history.slice(0, -1),
        cropMode: false,
        cropPoints: null,
        cloneSource: null,
      };
    }),

  // Returns the active page to the picture as uploaded (itself undoable).
  resetPage: () => {
    const page = get().activePage();
    if (!page || page.blob === page.original.blob) return false;
    get().commitImage(page.id, page.original);
    set({ cropMode: false, cropPoints: null, cloneSource: null });
    return true;
  },

  deletePage: async (id) => {
    await storage.deletePage(id);
    saved.delete(id);
    const { pages, activePageId } = get();
    const newPages = pages.filter((p) => p.id !== id);
    set({
      pages: newPages,
      ...(activePageId === id ? { activePageId: newPages[0]?.id || null, ...freshPageState } : {}),
    });
    showToast('Page deleted');
  },

  deleteAllPages: async () => {
    await storage.clearAll();
    saved.clear();
    set({ pages: [], activePageId: null, ...freshPageState });
    showToast('All pages deleted');
  },

  // Persistence
  loadFromDB: async () => {
    try {
      const records = await storage.getAllPages();
      if (records.length === 0) return;
      records.sort((a, b) => (a.order || 0) - (b.order || 0));
      const pages = await Promise.all(records.map(fromRecord));
      set({ pages, activePageId: pages[0].id, ...freshPageState });
      showToast(`Restored ${pages.length} page(s)`);
    } catch (err) {
      console.error('Failed to load pages:', err);
    }
  },

  // Writes the pages that changed since the last save. Returns whether
  // everything is stored.
  saveToDB: async () => {
    const { pages } = get();
    try {
      for (let order = 0; order < pages.length; order++) {
        const page = pages[order];
        const last = saved.get(page.id);
        if (last?.page === page && last.order === order) continue;
        await storage.savePage(toRecord(page, order));
        saved.set(page.id, { page, order });
      }
      return true;
    } catch (err) {
      console.error('Failed to save:', err);
      showToast('Pages could not be saved in this browser — export them before closing', true);
      return false;
    }
  },
}));
