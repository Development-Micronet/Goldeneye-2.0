import { create } from "zustand";
import type { SelectedArchiveProduct } from "../components/sidebar/store/useArchiveProductStore";

export type DrawTool = "Point" | "Polyline" | "Box" | "Polygon" | "Coordinates" | null;
interface PlotCoordinates {
  lat: number;
  lon: number;
  shape: "Square" | "Rectangle";
  width: number;
  height: number;
  area: number;
}

interface PlotBoundCoordinates {
  upperLeft: {
    lat: number;
    lon: number;
  };
  lowerRight: {
    lat: number;
    lon: number;
  };
  area: number;
}

export interface RectangleCoords {
  topLeftLat: number;
  topLeftLon: number;
  bottomRightLat: number;
  bottomRightLon: number;
}

export interface SearchLocationResult {
  id?: number;
  lat: number;
  lon: number;
  displayName: string;
  boundingbox?: [string, string, string, string] | [number, number, number, number];
}

interface MapState {
  plotCoordinates: PlotCoordinates | null;
  setPlotCoordinates: (coords: PlotCoordinates | null) => void;
  plotBoundCoordinates: PlotBoundCoordinates | null;
  setPlotBoundCoordinates: (coords: PlotBoundCoordinates | null) => void;
  flyToProduct: SelectedArchiveProduct | null;
  setFlyToProduct: (product: SelectedArchiveProduct | null) => void;
  searchLocation: SearchLocationResult | null;
  setSearchLocation: (location: SearchLocationResult | null) => void;
  activeTool: DrawTool;
  activeSubMenu: string | null;
  pointBufferDistance: string;
  polylineBufferDistance: string;
  polygonBufferDistance: string;
  drawRectangleCoords: RectangleCoords | null;
  fitLayerId: string | null;
  selectedLayerId: string | null;
  setActiveTool: (tool: DrawTool) => void;
  setActiveSubMenu: (subMenu: string | null) => void;
  setPointBufferDistance: (distance: string) => void;
  setPolylineBufferDistance: (distance: string) => void;
  setPolygonBufferDistance: (distance: string) => void;
  setDrawRectangleCoords: (coords: RectangleCoords | null) => void;
  setFitLayerId: (id: string | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  resetMapState: () => void;
  clearMapState: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  plotCoordinates: null,
  plotBoundCoordinates: null,
  activeTool: null,
  activeSubMenu: null,
  pointBufferDistance: "2.25",
  polylineBufferDistance: "2.25",
  polygonBufferDistance: "0",
  drawRectangleCoords: null,
  fitLayerId: null,
  selectedLayerId: null,
  flyToProduct: null,
  searchLocation: null,

  setSearchLocation: (location) =>
    set({
      searchLocation: location,
    }),

  setFlyToProduct: (product) =>
    set({
      flyToProduct: product,
    }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveSubMenu: (subMenu) => set({ activeSubMenu: subMenu }),
  setPointBufferDistance: (distance) => set({ pointBufferDistance: distance }),
  setPolylineBufferDistance: (distance) => set({ polylineBufferDistance: distance }),
  setPolygonBufferDistance: (distance) => set({ polygonBufferDistance: distance }),
  setDrawRectangleCoords: (coords) => set({ drawRectangleCoords: coords }),
  setFitLayerId: (id) => set({ fitLayerId: id }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  setPlotCoordinates: (coords) =>
    set({
      plotCoordinates: coords,
    }),
  setPlotBoundCoordinates: (coords) =>
    set({
      plotBoundCoordinates: coords,
    }),
  resetMapState: () =>
    set({
      activeTool: null,
      activeSubMenu: null,
      // pointBufferDistance: "2.25",
      // polylineBufferDistance: "2.25",
      // polygonBufferDistance: "0",
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
      polygonBufferDistance: "0",
      drawRectangleCoords: null,
      fitLayerId: null,
      selectedLayerId: null,
    }),
}));
