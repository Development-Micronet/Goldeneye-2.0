/**
 * Owns the MapLibre instance lifecycle.
 *
 * `styleEpoch` increments every time the style is (re)loaded. Feature hooks
 * depend on it so they can re-add their own sources after a style reload
 * without knowing anything about each other.
 */
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { BasemapDef, ProjectionMode } from "../types/types";
import { applyBasemap, buildBaseStyle } from "../lib/mapHelpers";
import { TERRAIN_SOURCE } from "../constants/basemaps";

export interface UseMapInstanceOptions {
  container: React.RefObject<HTMLDivElement | null>;
  basemap: BasemapDef;
  projection: ProjectionMode;
  center: [number, number];
  zoom: number;
}

export interface UseMapInstanceResult {
  map: MapLibreMap | null;
  styleEpoch: number;
}

export function useMapInstance({
  container,
  basemap,
  projection,
  center,
  zoom,
}: UseMapInstanceOptions): UseMapInstanceResult {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [styleEpoch, setStyleEpoch] = useState(0);
  // Initial values only — later changes go through the effects below.
  const initial = useRef({ basemap, projection, center, zoom });

  /* -------------------------------------------------- create / destroy */
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
      style: buildBaseStyle(initial.current.basemap, initial.current.projection),
      center: initial.current.center,
      zoom: initial.current.zoom,
      maxPitch: 85,
      hash: false,
      attributionControl: false,
      // Smooth, continuous globe navigation.
      dragRotate: true,
      pitchWithRotate: true,
      renderWorldCopies: true,
      fadeDuration: 200,
    });

    // Gentler wheel response so globe zooming does not overshoot.
    instance.scrollZoom.setWheelZoomRate(1 / 600);
    instance.touchZoomRotate.enableRotation();
    instance.keyboard.enable();

    instance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    instance.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }),
      "top-right",
    );
    instance.addControl(new maplibregl.FullscreenControl(), "top-right");
    instance.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left",
    );

    instance.on("style.load", () => setStyleEpoch((epoch) => epoch + 1));
    instance.on("error", (event) => {
      // Tile 404s from third-party services are noisy but not fatal.
      console.warn("[EarthMap]", event.error?.message ?? event);
    });

    mapRef.current = instance;
    setMap(instance);

    return () => {
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, [container]);

  /* ------------------------------------------------------- basemap swap */
  useEffect(() => {
    if (!map || !styleEpoch) return;
    applyBasemap(map, basemap, projection);
  }, [map, styleEpoch, basemap, projection]);

  /* -------------------------------------------------- projection switch */
  useEffect(() => {
    if (!map || !styleEpoch) return;
    map.setProjection({ type: projection });
  }, [map, styleEpoch, projection]);

  return { map, styleEpoch };
}

/* ------------------------------------------------------------------ */
/* Terrain + 3D                                                        */
/* ------------------------------------------------------------------ */

export interface TerrainOptions {
  enabled: boolean;
  exaggeration: number;
}

/** Attaches the free Terrarium DEM and keeps exaggeration in sync. */
export function useTerrain(
  map: MapLibreMap | null,
  styleEpoch: number,
  { enabled, exaggeration }: TerrainOptions,
): void {
  useEffect(() => {
    if (!map || !styleEpoch) return;

    if (!map.getSource(TERRAIN_SOURCE.id)) {
      map.addSource(TERRAIN_SOURCE.id, {
        type: "raster-dem",
        tiles: TERRAIN_SOURCE.tiles,
        encoding: TERRAIN_SOURCE.encoding,
        tileSize: TERRAIN_SOURCE.tileSize,
        maxzoom: TERRAIN_SOURCE.maxzoom,
        attribution: TERRAIN_SOURCE.attribution,
      });
    }

    if (enabled) {
      map.setTerrain({ source: TERRAIN_SOURCE.id, exaggeration });
    } else if (map.getTerrain()) {
      map.setTerrain(null);
    }
  }, [map, styleEpoch, enabled, exaggeration]);
}