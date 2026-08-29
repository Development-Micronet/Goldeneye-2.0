import { create } from "zustand";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import type { SelectedArchiveProduct } from "../components/sidebar/store/useArchiveProductStore";

interface AoiStore {
  drawnAois: Feature<Geometry>[];

  addDrawnAoi: (feature: Feature<Geometry>) => void;
  removeDrawnAoi: (id: string) => void;
  clearDrawnAois: () => void;

  hoveredProduct: SelectedArchiveProduct | null;
  setHoveredProduct: (product: SelectedArchiveProduct | null) => void;
}

const useAoiStore = create<AoiStore>((set) => ({
  drawnAois: [],

  addDrawnAoi: (feature) =>
    set((state) => ({
      drawnAois: [...state.drawnAois, feature],
    })),

  removeDrawnAoi: (id) =>
    set((state) => ({
      drawnAois: state.drawnAois.filter((feature) => feature.getId() !== id),
    })),

  clearDrawnAois: () =>
    set({
      drawnAois: [],
    }),

  hoveredProduct: null,

  setHoveredProduct: (product) =>
    set({
      hoveredProduct: product,
    }),
}));

export default useAoiStore;
