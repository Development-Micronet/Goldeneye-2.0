import { create } from "zustand";
import type { ProductFeature } from "../Models/product.types";

export interface SelectedArchiveProduct {
  id: string;
  name: string;
  imageUrl: string;
  coordinates: unknown;
  geometry: unknown;

  date: string;
  acquisitionDate?: string;
  sensor: string;

  resolution?: number;
  cloud_cover?: number | string;
  incidenceAngle?: number;
  raw?: ProductFeature["properties"]["raw"];
  thumbnailUrl?: string;
}

interface ArchiveProductStore {
  selectedProducts: SelectedArchiveProduct[];
  visibleProducts: SelectedArchiveProduct[];

  addProduct: (product: SelectedArchiveProduct) => void;
  removeProduct: (id: string) => void;

  toggleProduct: (product: SelectedArchiveProduct) => void;

  selectAllProducts: (products: SelectedArchiveProduct[]) => void;
  clearProducts: () => void;

  toggleVisibility: (product: SelectedArchiveProduct) => void;
  showSelectedProducts: () => void;
  hideAllProducts: () => void;

  isSelected: (id: string) => boolean;
  isVisible: (id: string) => boolean;
}

export const useArchiveProductStore = create<ArchiveProductStore>((set, get) => ({
  selectedProducts: [],
  visibleProducts: [],

  addProduct: (product) =>
    set((state) => ({
      selectedProducts: [...state.selectedProducts, product],
    })),

  removeProduct: (id) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.filter((product) => product.id !== id),

      visibleProducts: state.visibleProducts.filter((product) => product.id !== id),
    })),

  toggleProduct: (product) =>
    set((state) => {
      const exists = state.selectedProducts.some((x) => x.id === product.id);

      return {
        selectedProducts: exists
          ? state.selectedProducts.filter((x) => x.id !== product.id)
          : [...state.selectedProducts, product],

        visibleProducts: exists
          ? state.visibleProducts.filter((x) => x.id !== product.id)
          : state.visibleProducts,
      };
    }),

  selectAllProducts: (products) =>
    set({
      selectedProducts: products,
    }),

  clearProducts: () =>
    set({
      selectedProducts: [],
      visibleProducts: [],
    }),

  // Individual eye toggle
  toggleVisibility: (product) =>
    set((state) => {
      const visible = state.visibleProducts.some((x) => x.id === product.id);

      return {
        visibleProducts: visible
          ? state.visibleProducts.filter((x) => x.id !== product.id)
          : [...state.visibleProducts, product],
      };
    }),

  // Show all selected products on map
  showSelectedProducts: () =>
    set((state) => ({
      visibleProducts: state.selectedProducts,
    })),

  // Hide all products from map
  hideAllProducts: () =>
    set({
      visibleProducts: [],
    }),

  isSelected: (id) => get().selectedProducts.some((product) => product.id === id),

  isVisible: (id) => get().visibleProducts.some((product) => product.id === id),
}));
