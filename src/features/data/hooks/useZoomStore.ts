import { create } from "zustand";

interface ZoomStore {
  zoom: number;
  minZoom: number;
  maxZoom: number;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const DEFAULT_MIN_ZOOM = 4;
const DEFAULT_MAX_ZOOM = 18;
const DEFAULT_ZOOM = 8;
const useZoomStore = create<ZoomStore>((set, get) => ({
  zoom: DEFAULT_ZOOM,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,

  setZoom: (zoom) =>
    set({
      zoom: Math.max(get().minZoom, Math.min(zoom, get().maxZoom)),
    }),

  zoomIn: () =>
    set((state) => ({
      zoom: Math.min(state.zoom + 1, state.maxZoom),
    })),

  zoomOut: () =>
    set((state) => ({
      zoom: Math.max(state.zoom - 1, state.minZoom),
    })),

  resetZoom: () =>
    set({
      zoom: DEFAULT_ZOOM,
    }),
}));

export default useZoomStore;
