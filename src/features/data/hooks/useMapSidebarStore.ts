import { create } from "zustand";

interface MapSidebarStore {
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  openArchive: () => void;
  openTasking: () => void;
}

export const useMapSidebarStore = create<MapSidebarStore>((set) => ({
  activeIndex: null,
  setActiveIndex: (index) => set({ activeIndex: index }),
  openArchive: () => set({ activeIndex: 0 }),
  openTasking: () => set({ activeIndex: 1 }),
}));
