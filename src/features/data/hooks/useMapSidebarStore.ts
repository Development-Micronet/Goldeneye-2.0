import { create } from "zustand";

interface MapSidebarStore {
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  openArchive: () => void;
  openTasking: () => void;
  toggleArchive: () => void;
  toggleTasking: () => void;
  closeSidebar: () => void;
}

export const useMapSidebarStore = create<MapSidebarStore>((set) => ({
  activeIndex: null,
  setActiveIndex: (index) => set({ activeIndex: index }),
  openArchive: () => set({ activeIndex: 0 }),
  openTasking: () => set({ activeIndex: 1 }),
  toggleArchive: () =>
    set((state) => ({
      activeIndex: state.activeIndex === 0 ? null : 0,
    })),
  toggleTasking: () =>
    set((state) => ({
      activeIndex: state.activeIndex === 1 ? null : 1,
    })),
  closeSidebar: () => set({ activeIndex: null }),
}));
