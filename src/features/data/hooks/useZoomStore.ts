import { create } from "zustand";
import { useAuthStore } from "../../../store/useAuthStore";
import { isSpecialZoomCategory } from "../../../utils/zoomPermissions";

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

export const DEFAULT_MIN_ZOOM = 4;
export const DEFAULT_MAX_ZOOM = 25;
export const UNRESTRICTED_MAX_ZOOM = 40;
const DEFAULT_ZOOM = 8;

const getInitialMaxZoom = () => {
  const user = useAuthStore.getState().user;
  return isSpecialZoomCategory(user) ? UNRESTRICTED_MAX_ZOOM : DEFAULT_MAX_ZOOM;
};

const useZoomStore = create<ZoomStore>((set, get) => ({
  zoom: DEFAULT_ZOOM,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: getInitialMaxZoom(),

  setZoom: (zoom) =>
    set({
      zoom: Math.round(Math.max(get().minZoom, Math.min(zoom, get().maxZoom))),
    }),

  setMaxZoom: (maxZoom) => {
    const user = useAuthStore.getState().user;
    const effectiveMaxZoom = isSpecialZoomCategory(user) ? UNRESTRICTED_MAX_ZOOM : maxZoom;
    set({
      maxZoom: effectiveMaxZoom,
    });
  },

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

  resetMaxZoom: () => {
    const user = useAuthStore.getState().user;
    const isSpecial = isSpecialZoomCategory(user);
    set({
      maxZoom: isSpecial ? UNRESTRICTED_MAX_ZOOM : DEFAULT_MAX_ZOOM,
    });
  },
}));

export default useZoomStore;

