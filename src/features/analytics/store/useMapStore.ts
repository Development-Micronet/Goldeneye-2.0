// import { create } from "zustand";
// import type { Map } from "maplibre-gl";

// interface MapStore {
//   map: Map | null;
//   setMap: (map: Map) => void;
//   clearMap: () => void;
// }

// export const useMapStore = create<MapStore>((set) => ({
//   map: null,

//   setMap: (map) =>
//     set({
//       map,
//     }),

//   clearMap: () =>
//     set({
//       map: null,
//     }),
// }));

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { Map } from "maplibre-gl";

export type MapMode = string;
export type Maptype = "2d" | "3d";
export type AnalyticsDrawTool = "polygon" | "rectangle" | "circle" | null;

interface MapStore {
  map: Map | null;

  // Selected layer
  mapMode: MapMode;
  Maptype: Maptype;
  activeDrawTool: AnalyticsDrawTool;

  setMap: (map: Map) => void;
  buildingColor: string;

  clearMap: () => void;

  setMapMode: (mode: MapMode) => void;
  setMaptype: (type: Maptype) => void;
  setActiveDrawTool: (tool: AnalyticsDrawTool) => void;
  setBuildingColor: (color: string) => void;
}

export const useMapStore = create<MapStore>()(
  devtools(
    (set) => ({
      map: null,

      // Default layer
      mapMode: "osm",
      Maptype: "2d",
      buildingColor: "#2C6671",
      activeDrawTool: null,

      setMap: (map) => set({ map }, false, "map/setMap"),

      clearMap: () => set({ map: null }, false, "map/clearMap"),

      setMapMode: (mode) => set({ mapMode: mode }, false, "map/setMapMode"),
      setMaptype: (type) => set({ Maptype: type }, false, "map/setMaptype"),
      setActiveDrawTool: (tool) => set({ activeDrawTool: tool }, false, "map/setActiveDrawTool"),
      setBuildingColor: (color) => set({ buildingColor: color }, false, "map/setBuildingColor"),
    }),
    {
      name: "MapStore",
      stateSanitizer: (state) => ({
        ...state,
        map: state.map ? "[MapLibre Instance]" : null,
      }),
    },
  ),
);
