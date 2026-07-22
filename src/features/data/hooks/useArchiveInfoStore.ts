import { create } from "zustand";
import type { SelectedArchiveProduct } from "../components/sidebar/store/useArchiveProductStore";


interface ArchiveInfoStore {
  infoProduct: SelectedArchiveProduct | null;
  setInfoProduct: (product: SelectedArchiveProduct | null) => void;
}

export const useArchiveInfoStore = create<ArchiveInfoStore>((set) => ({
  infoProduct: null,
  setInfoProduct: (product) => set({ infoProduct: product }),
}));
