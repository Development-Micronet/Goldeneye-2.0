import { create } from "zustand";

type SelectedItem = {
  product: string;
  resolution: string;
  subcategory: string;
  sensor: string;
};

interface ProductStore {
  selectedItems: SelectedItem[];

  addProduct: (item: SelectedItem) => void;
  removeProduct: (subcategory: string) => void;
  clearProducts: () => void;
  setProducts: (items: SelectedItem[]) => void;

  isSelected: (subcategory: string) => boolean;

  getSensors: () => string[];
}

export const useProductStore = create<ProductStore>((set, get) => ({
  selectedItems: [],

  addProduct: (item) =>
    set((state) => ({
      selectedItems: [...state.selectedItems, item],
    })),

  removeProduct: (subcategory) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter((x) => x.subcategory !== subcategory),
    })),

  clearProducts: () =>
    set({
      selectedItems: [],
    }),

  setProducts: (items) =>
    set({
      selectedItems: items,
    }),

  isSelected: (subcategory) => get().selectedItems.some((x) => x.subcategory === subcategory),

  getSensors: () => {
    const sensors = get().selectedItems.map((item) => item.sensor);

    return [...new Set(sensors)];
  },
}));
