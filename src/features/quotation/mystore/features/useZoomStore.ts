import { create } from "zustand";

interface ZoomStore {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
}

export const useZoomStore = create<ZoomStore>((set) => ({
  zoomLevel: 10,
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
}));
