import { create } from "zustand";

interface ZoomStore {
  zoom: number;
  minZoom: number;
  maxZoom: number;

  setZoom: (zoom: number) => void;
  setMaxZoom: (maxZoom: number) => void;
  resetMaxZoom: () => void;

  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const DEFAULT_MIN_ZOOM = 4;
const DEFAULT_MAX_ZOOM = 25;
const DEFAULT_ZOOM = 8;

const useZoomStore = create<ZoomStore>((set, get) => ({
  zoom: DEFAULT_ZOOM,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,

  setZoom: (zoom) =>
    set({
      zoom: Math.round(Math.max(get().minZoom, Math.min(zoom, get().maxZoom))),
    }),

  setMaxZoom: (maxZoom) =>
    set({
      maxZoom,
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
    set((state) => ({
      zoom: Math.min(DEFAULT_ZOOM, state.maxZoom),
    })),
  resetMaxZoom: () =>
    set({
      maxZoom: DEFAULT_MAX_ZOOM,
    }),
}));

export default useZoomStore;
