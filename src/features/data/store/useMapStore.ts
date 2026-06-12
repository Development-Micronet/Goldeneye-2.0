import { create } from "zustand";

export type DrawTool = "Point" | "Polyline" | "Box" | "Polygon" | "Coordinates" | null;

export interface RectangleCoords {
  topLeftLat: number;
  topLeftLon: number;
  bottomRightLat: number;
  bottomRightLon: number;
}

interface MapState {
  activeTool: DrawTool;
  activeSubMenu: string | null;
  pointBufferDistance: string;
  polylineBufferDistance: string;
  drawRectangleCoords: RectangleCoords | null;
  fitLayerId: string | null;
  selectedLayerId: string | null;
  setActiveTool: (tool: DrawTool) => void;
  setActiveSubMenu: (subMenu: string | null) => void;
  setPointBufferDistance: (distance: string) => void;
  setPolylineBufferDistance: (distance: string) => void;
  setDrawRectangleCoords: (coords: RectangleCoords | null) => void;
  setFitLayerId: (id: string | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  resetMapState: () => void;
  clearMapState: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  activeTool: null,
  activeSubMenu: null,
  pointBufferDistance: "2.25",
  polylineBufferDistance: "2.25",
  drawRectangleCoords: null,
  fitLayerId: null,
  selectedLayerId: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveSubMenu: (subMenu) => set({ activeSubMenu: subMenu }),
  setPointBufferDistance: (distance) => set({ pointBufferDistance: distance }),
  setPolylineBufferDistance: (distance) => set({ polylineBufferDistance: distance }),
  setDrawRectangleCoords: (coords) => set({ drawRectangleCoords: coords }),
  setFitLayerId: (id) => set({ fitLayerId: id }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  resetMapState: () =>
    set({
      activeTool: null,
      activeSubMenu: null,
      // pointBufferDistance: "2.25",
      // polylineBufferDistance: "2.25",
      drawRectangleCoords: null,
      fitLayerId: null,
      selectedLayerId: null,
    }),
  clearMapState: () =>
    set({
      activeTool: null,
      activeSubMenu: null,
      pointBufferDistance: "2.25",
      polylineBufferDistance: "2.25",
      drawRectangleCoords: null,
      fitLayerId: null,
      selectedLayerId: null,
    }),
}));
