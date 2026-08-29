import { create } from "zustand";
import type { SelectedArchiveProduct } from "../components/sidebar/store/useArchiveProductStore";

interface PinnedProductStore {
  pinnedProducts: SelectedArchiveProduct[];

  addPinnedProduct: (product: SelectedArchiveProduct) => void;
  removePinnedProduct: (id: string) => void;
  clearPinnedProducts: () => void;

  isPinned: (id: string) => boolean;
  selectAllPinned: (products: SelectedArchiveProduct[]) => void;
}

export const usePinnedProductStore = create<PinnedProductStore>((set, get) => ({
  pinnedProducts: [],

  addPinnedProduct: (product) =>
    set((state) => {
      const exists = state.pinnedProducts.some((p) => p.id === product.id);

      if (exists) return state;

      return {
        pinnedProducts: [...state.pinnedProducts, product],
      };
    }),

  removePinnedProduct: (id) =>
    set((state) => ({
      pinnedProducts: state.pinnedProducts.filter((p) => p.id !== id),
    })),

  clearPinnedProducts: () =>
    set({
      pinnedProducts: [],
    }),

  isPinned: (id) => get().pinnedProducts.some((p) => p.id === id),

  selectAllPinned: (products) =>
    set({
      pinnedProducts: products,
    }),
}));
