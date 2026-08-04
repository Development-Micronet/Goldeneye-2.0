import { create } from "zustand";

interface ProductStore {
  selectedProducts: any[];
  setSelectedProducts: (products: any[]) => void;
  addProduct: (product: any) => void;
  removeProduct: (productId: any) => void;
  clearProducts: () => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  selectedProducts: [],
  setSelectedProducts: (selectedProducts) => set({ selectedProducts }),
  addProduct: (product) =>
    set((state) => ({ selectedProducts: [...state.selectedProducts, product] })),
  removeProduct: (productId) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.filter((p) => p.id !== productId),
    })),
  clearProducts: () => set({ selectedProducts: [] }),
}));
