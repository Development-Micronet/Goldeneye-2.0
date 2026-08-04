import { create } from "zustand";

interface AreaStore {
  area: number | string | null;
  setArea: (area: number | string | null) => void;
  resetArea: () => void;
}

export const useAreaStore = create<AreaStore>((set) => ({
  area: null,
  setArea: (area) => set({ area }),
  resetArea: () => set({ area: null }),
}));
