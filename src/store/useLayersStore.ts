import { create } from "zustand";

export interface DrawnLayer {
  id: string;
  label: string;
  type: "Point" | "Polyline" | "Polygon" | "Box" | "Coordinates";
  geojson: any; // GeoJSON feature object representation
  area?: number;
  visible?: boolean;
}

interface LayersState {
  layers: DrawnLayer[];
  addLayer: (layer: Omit<DrawnLayer, "id" | "label"> & { label?: string }) => DrawnLayer;
  removeLayer: (id: string) => void;
  clearLayers: () => void;
  toggleLayerVisibility: (id: string) => void;
  updateLayerLabel: (id: string, label: string) => void;
}

export const useLayersStore = create<LayersState>()((set) => ({
  layers: [],
  addLayer: (layerData) => {
    let newLayer: DrawnLayer;
    set((state) => {
      const id = typeof crypto !== "undefined" && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 9);

      const typeLabelMap: Record<string, string> = {
        Box: "Rectangle",
        Coordinates: "Rectangle",
        Point: "Point",
        Polyline: "Polyline",
        Polygon: "Polygon",
      };
      
      const labelPrefix = typeLabelMap[layerData.type] || layerData.type;
      
      let maxNum = 0;
      state.layers.forEach((l) => {
        if (l.label.startsWith(labelPrefix + " ")) {
          const numStr = l.label.slice(labelPrefix.length + 1);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const label = layerData.label || `${labelPrefix} ${maxNum + 1}`;

      newLayer = {
        ...layerData,
        id,
        label,
      };

      return {
        layers: [...state.layers, newLayer],
      };
    });
    return newLayer!;
  },
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
    })),
  clearLayers: () => set({ layers: [] }),
  toggleLayerVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: l.visible === false } : l
      ),
    })),
  updateLayerLabel: (id, label) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, label } : l)),
    })),
}));
