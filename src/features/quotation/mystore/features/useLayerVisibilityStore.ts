import { create } from "zustand";

interface LayerVisibilityStore {
  layerVisibility: boolean;
  toggleLayerVisibility: () => void;
  setLayerVisibility: (visible: boolean) => void;
}

export const useLayerVisibilityStore = create<LayerVisibilityStore>((set) => ({
  layerVisibility: true,
  toggleLayerVisibility: () => set((state) => ({ layerVisibility: !state.layerVisibility })),
  setLayerVisibility: (layerVisibility) => set({ layerVisibility }),
}));
