import { create } from "zustand";
import type { ProductFeature } from "../Models/product.types";

export interface SelectedArchiveProduct {
  id: string;
  name: string;
  imageUrl: string;
  wmts_url?: string;
  wms_url?: string;
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
  loadingProductIds: string[];

  addProduct: (product: SelectedArchiveProduct) => void;
  removeProduct: (id: string) => void;

  toggleProduct: (product: SelectedArchiveProduct) => void;

  selectAllProducts: (products: SelectedArchiveProduct[]) => void;
  clearProducts: () => void;

  toggleVisibility: (product: SelectedArchiveProduct) => void;
  showSelectedProducts: () => void;
  hideAllProducts: () => void;

  setProductLoading: (id: string, loading: boolean) => void;
  isProductLoading: (id: string) => boolean;

  isSelected: (id: string) => boolean;
  isVisible: (id: string) => boolean;
}

export const useArchiveProductStore = create<ArchiveProductStore>((set, get) => ({
  selectedProducts: [],
  visibleProducts: [],
  loadingProductIds: [],

  addProduct: (product) =>
    set((state) => ({
      selectedProducts: [...state.selectedProducts, product],
    })),

  removeProduct: (id) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.filter((product) => product.id !== id),
      visibleProducts: state.visibleProducts.filter((product) => product.id !== id),
      loadingProductIds: state.loadingProductIds.filter((productId) => productId !== id),
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

        loadingProductIds: exists
          ? state.loadingProductIds.filter((id) => id !== product.id)
          : state.loadingProductIds,
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
      loadingProductIds: [],
    }),

  // Individual eye toggle
  toggleVisibility: (product) =>
    set((state) => {
      const visible = state.visibleProducts.some((x) => x.id === product.id);

      if (visible) {
        return {
          visibleProducts: state.visibleProducts.filter((x) => x.id !== product.id),
          loadingProductIds: state.loadingProductIds.filter((id) => id !== product.id),
        };
      }

      return {
        visibleProducts: [...state.visibleProducts, product],
        loadingProductIds: product.wmts_url
          ? [...new Set([...state.loadingProductIds, product.id])]
          : state.loadingProductIds,
      };
    }),

  // Show all selected products on map
  showSelectedProducts: () =>
    set((state) => ({
      visibleProducts: state.selectedProducts,
      loadingProductIds: [
        ...new Set([
          ...state.loadingProductIds,
          ...state.selectedProducts.filter((p) => p.wmts_url).map((p) => p.id),
        ]),
      ],
    })),

  // Hide all products from map
  hideAllProducts: () =>
    set({
      visibleProducts: [],
      loadingProductIds: [],
    }),

  setProductLoading: (id, loading) =>
    set((state) => ({
      loadingProductIds: loading
        ? state.loadingProductIds.includes(id)
          ? state.loadingProductIds
          : [...state.loadingProductIds, id]
        : state.loadingProductIds.filter((productId) => productId !== id),
    })),

  isProductLoading: (id) => get().loadingProductIds.includes(id),

  isSelected: (id) => get().selectedProducts.some((product) => product.id === id),

  isVisible: (id) => get().visibleProducts.some((product) => product.id === id),
}));
