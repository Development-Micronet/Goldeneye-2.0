import { create } from "zustand";
import type { SelectedArchiveProduct } from "../components/sidebar/store/useArchiveProductStore";

interface ArchiveHoverStore {
  hoveredProduct: SelectedArchiveProduct | null;

  setHoveredProduct: (product: SelectedArchiveProduct | null) => void;
}

export const useArchiveHoverStore = create<ArchiveHoverStore>((set) => ({
  hoveredProduct: null,

  setHoveredProduct: (product) =>
    set({
      hoveredProduct: product,
    }),
}));
