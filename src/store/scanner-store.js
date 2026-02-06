import { create } from 'zustand';
import { storage } from '../lib/page-storage';
import { showToast } from '../lib/utils';

export const useScannerStore = create((set, get) => ({
  pages: [],
  activePageId: null,
  zoom: 60,
  isProcessing: false,
  processingMessage: 'Processing...',
  rightPanelOpen: true,
  activeTool: 'enhance',
  enhanceMode: 'auto',
  enhanceIntensity: 75,
  cropMode: false,
  cropPoints: null,
  paintHistory: [],
  brushColor: '#000000',
  brushSize: 10,

  dialog: { open: false, title: '', description: '', onConfirm: null, variant: 'default' },

  // Computed
  activePage: () => {
    const { pages, activePageId } = get();
    return pages.find((p) => p.id === activePageId) || null;
  },

  // Setters
  setZoom: (fn) => set((s) => ({ zoom: typeof fn === 'function' ? fn(s.zoom) : fn })),
  setActivePageId: (id) => set({ activePageId: id, cropMode: false, cropPoints: null, paintHistory: [] }),
  setProcessing: (isProcessing, msg) => set({ isProcessing, ...(msg ? { processingMessage: msg } : {}) }),
  setActiveTool: (tool) => {
    set((s) => ({
      activeTool: tool,
      cropMode: tool === 'edit' ? s.cropMode : false,
      cropPoints: tool === 'edit' ? s.cropPoints : null,
      rightPanelOpen: true,
    }));
  },
  setEnhanceMode: (mode) => set({ enhanceMode: mode }),
  setEnhanceIntensity: (v) => set({ enhanceIntensity: v }),
  setCropMode: (v) => set({ cropMode: v, ...(v ? {} : { cropPoints: null }) }),
  setCropPoints: (fn) => set((s) => ({ cropPoints: typeof fn === 'function' ? fn(s.cropPoints) : fn })),
  setBrushColor: (c) => set({ brushColor: c }),
  setBrushSize: (s) => set({ brushSize: s }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
  setDialog: (d) => set({ dialog: d }),
  pushPaintHistory: (entry) =>
    set((s) => ({
      paintHistory: s.paintHistory.length >= 10
        ? [...s.paintHistory.slice(1), entry]
        : [...s.paintHistory, entry],
    })),
  popPaintHistory: () =>
    set((s) => ({ paintHistory: s.paintHistory.slice(0, -1) })),

  // Page mutations
  addPage: (page) =>
    set((s) => ({
      pages: [...s.pages, page],
      activePageId: s.activePageId || page.id,
    })),

  updatePage: (id, changes) =>
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    })),

  deletePage: async (id) => {
    const { pages, activePageId } = get();
    await storage.deletePage(id);
    const newPages = pages.filter((p) => p.id !== id);
    set({
      pages: newPages,
      activePageId: activePageId === id ? (newPages[0]?.id || null) : activePageId,
    });
    showToast('Page deleted');
  },

  deleteAllPages: async () => {
    await storage.clearAll();
    set({ pages: [], activePageId: null, cropMode: false, cropPoints: null, paintHistory: [] });
    showToast('All pages deleted');
  },

  // Persistence
  loadFromDB: async () => {
    try {
      const saved = await storage.getAllPages();
      if (saved.length > 0) {
        saved.sort((a, b) => (a.order || 0) - (b.order || 0));
        set({ pages: saved, activePageId: saved[0].id });
        showToast(`Restored ${saved.length} page(s)`);
      }
    } catch (err) {
      console.error('Failed to load pages:', err);
    }
  },

  saveToDB: async () => {
    const { pages } = get();
    try {
      for (let i = 0; i < pages.length; i++) {
        await storage.savePage({ ...pages[i], order: i });
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  },
}));