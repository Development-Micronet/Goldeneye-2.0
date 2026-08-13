// utils/mapRegistry.ts
import type { Map } from "maplibre-gl";

let instance: Map | null = null;

export const setMapInstance = (map: Map | null) => {
  instance = map;
};

export const getMapInstance = () => instance;

export const rasterSourceId = (id: string) => `raster-source-${id}`;
export const rasterLayerId = (id: string) => `raster-layer-${id}`;
