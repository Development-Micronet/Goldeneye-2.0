import { create } from "zustand";

interface TechSpecStore {
  techImages: any[];
  setTechImages: (newImages: any[]) => void;
  resetTechImages: () => void;
}

export const useTechSpecStore = create<TechSpecStore>((set) => ({
  techImages: [],

  setTechImages: (newImages) =>
    set((state) => {
      const updatedList = [...state.techImages];
      (newImages || []).forEach((img: any) => {
        const exists = updatedList.some(
          (i) => i.techspec_id === img.techspec_id
        );
        if (!exists) {
          updatedList.push(img);
        }
      });
      return { techImages: updatedList };
    }),

  resetTechImages: () => set({ techImages: [] }),
}));
