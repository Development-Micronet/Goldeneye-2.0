// src/hooks/useBaseMapStore.ts
import { create } from "zustand";

export type BaseMapType = "Google Road Map" | "ESRI Imagery" | "OpenStreetMap";

interface BaseMapStore {
  activeLayer: BaseMapType;
  setActiveLayer: (layer: BaseMapType) => void;
}

const useBaseMapStore = create<BaseMapStore>((set) => ({
  activeLayer: "OpenStreetMap",

  setActiveLayer: (layer) =>
    set({
      activeLayer: layer,
    }),
}));

export default useBaseMapStore;
