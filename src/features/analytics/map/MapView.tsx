import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { useMapStore } from "../store/useMapStore";
import { useRasterLayers } from "../core/useRasterLayers";
import { useLayerSync } from "../core/useLayerSync";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawRenderMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { exportGeoTIFFFromMapLibreFeature } from "../../../utils/geoTiffExport";

import { sanitizeMapStyle } from "../utils/sanitizeStyle";
import { useRasterStore } from "../store/useRasterStore";
// import { usebuildingcolor } from "../core/usebuildingcolor";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const isWebGLSupported = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl") ||
        canvas.getContext("webgl2"))
    );
  } catch {
    return false;
  }
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useMapStore((state) => state.map);
  const setMap = useMapStore((state) => state.setMap);
  const clearMap = useMapStore((state) => state.clearMap);
  const mapType = useMapStore((state) => state.Maptype);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLSupported()) {
      console.error("[maplibre] WebGL is not supported on this device/browser.");
      setIsSupported(false);
      return;
    }

    if (!mapContainer.current) return;

    let isMounted = true;
    let mapInstance: maplibregl.Map | null = null;

    const initMap = async () => {
      let styleParam: string | maplibregl.StyleSpecification = STYLE_URL;

      try {
        const res = await fetch(STYLE_URL);
        if (res.ok) {
          const rawStyle = await res.json();
          styleParam = sanitizeMapStyle(rawStyle);
        }
      } catch (err) {
        console.warn("[maplibre] Could not pre-fetch style JSON, falling back to URL string:", err);
      }

      if (!isMounted || !mapContainer.current) return;

      try {
        mapInstance = new maplibregl.Map({
          container: mapContainer.current,
          style: styleParam,
          center: [55.2744, 25.1972],
          zoom: 16,
          pitch: mapType === "3d" ? 60 : 0,
          bearing: mapType === "3d" ? -20 : 0,
          preserveDrawingBuffer: true,
        });

        mapInstance.on("styleimagemissing", (e) => {
          const id = e.id;
          if (mapInstance && !mapInstance.hasImage(id)) {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const imageData = ctx.createImageData(1, 1);
              mapInstance.addImage(id, imageData);
            }
          }
        });

        mapInstance.on("error", (e) => {
          const msg = e.error?.message ?? String(e);
          if (msg.includes("Image") || msg.includes("could not be loaded")) return;
          console.warn("[maplibre]", msg);
        });

        mapInstance.on("load", () => {
          if (!isMounted || !mapInstance) return;
          mapInstance.resize();
          setMap(mapInstance);
          setMapLoaded(true);
        });
      } catch (err) {
        console.error("[maplibre] Failed to initialize map:", err);
        if (isMounted) {
          setIsSupported(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      clearMap();
      setMapLoaded(false);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [setMap, clearMap]);

  useEffect(() => {
    if (!map) return;

    if (mapType === "3d") {
      map.easeTo({
        pitch: 60,
        bearing: -20,
        duration: 800,
      });
    } else {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    }
  }, [map, mapType]);

  useEffect(() => {
    if (!map) return;

    const toggleBuildingLayers = () => {
      const style = map.getStyle();
      // console.log("style", style.layers)
      style.layers?.forEach((layer) => {
        // console.log("layer", layer)
        if (layer.type === "fill-extrusion") {
          map.setLayoutProperty(layer.id, "visibility", mapType === "3d" ? "visible" : "none");
        }
        if (layer.type === "raster") {
          map.setLayoutProperty(layer.id, "visibility", mapType === "3d" ? "visible" : "none");
        }
        if (layer.type === "line") {
          map.setLayoutProperty(layer.id, "visibility", mapType === "3d" ? "visible" : "none");

          map.setPaintProperty(layer.id, "line-color", mapType === "3d" ? "#00000073" : "#ffffff");
        }
      });
    };

    if (map.isStyleLoaded()) {
      toggleBuildingLayers();
    } else {
      map.once("load", toggleBuildingLayers);
    }

    return () => {
      map.off("load", toggleBuildingLayers);
    };
  }, [map, mapType]);

  // Basemap and buildings first, rasters after.
  useLayerSync(mapLoaded ? map : null);
  useRasterLayers(mapLoaded ? map : null);

  const activeDrawTool = useMapStore((state) => state.activeDrawTool);
  const setActiveDrawTool = useMapStore((state) => state.setActiveDrawTool);
  const drawInstanceRef = useRef<TerraDraw | null>(null);

  // Initialize and sync TerraDraw for AOI drawing
  useEffect(() => {
    if (!mapLoaded || !map) return;

    try {
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawRenderMode({ modeName: "render" }),
          new TerraDrawPolygonMode(),
          new TerraDrawRectangleMode(),
          new TerraDrawCircleMode(),
        ],
      });

      draw.start();

      draw.on("finish", async (id: string | number) => {
        // Capture the feature data first, before clearing
        const snapshot = draw.getSnapshot();
        const feature = snapshot.find((f: any) => f.id === id);

        try {
          if (feature && map) {
            // 1. Switch mode to render (removes active tool UI)
            draw.setMode("render");
            // 2. Clear ALL drawn shapes from the TerraDraw sources on the map
            draw.clear();

            // 3. Wait for MapLibre to reach 'idle' — this fires only after all
            //    pending source/layer removals are fully rendered, so the blue
            //    overlay is completely gone before we capture the screenshot.
            await new Promise<void>((resolve) => {
              const onIdle = () => resolve();
              map.once("idle", onIdle);
              // safety fallback: if idle never fires, resolve after 2s
              setTimeout(() => {
                map.off("idle", onIdle);
                resolve();
              }, 2000);
            });

            // 4. Now export — canvas will be clean
            await exportGeoTIFFFromMapLibreFeature(feature, "Analytics_AOI");
          }
        } catch (e) {
          console.error("Error processing drawn AOI GeoTIFF:", e);
        } finally {
          setActiveDrawTool(null);
        }
      });

      drawInstanceRef.current = draw;
    } catch (err) {
      console.error("Failed to initialize TerraDraw on MapLibre:", err);
    }

    return () => {
      if (drawInstanceRef.current) {
        try {
          drawInstanceRef.current.stop();
        } catch {}
        drawInstanceRef.current = null;
      }
    };
  }, [mapLoaded, map, setActiveDrawTool]);

  // Sync activeDrawTool state to TerraDraw mode
  useEffect(() => {
    const draw = drawInstanceRef.current;
    if (!draw) return;

    try {
      if (activeDrawTool === "polygon") {
        draw.setMode("polygon");
      } else if (activeDrawTool === "rectangle") {
        draw.setMode("rectangle");
      } else if (activeDrawTool === "circle") {
        draw.setMode("circle");
      } else {
        draw.setMode("render");
      }
    } catch (err) {
      console.warn("Error setting TerraDraw mode:", err);
    }
  }, [activeDrawTool]);

  // Display drawn / active raster AOI boundary outline on map
  const rasters = useRasterStore((state) => state.rasters);
  const fitRasterId = useRasterStore((state) => state.fitRasterId);

  useEffect(() => {
    if (!mapLoaded || !map) return;

    const sourceId = "analytics-aoi-outline-source";
    const fillLayerId = "analytics-aoi-outline-fill";
    const lineLayerId = "analytics-aoi-outline-line";

    const targetRaster = rasters.find((r) => r.id === fitRasterId) || rasters[rasters.length - 1];

    if (!targetRaster || !targetRaster.aoi || targetRaster.aoi.length !== 4) {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const [minLon, minLat, maxLon, maxLat] = targetRaster.aoi;
    const geojson: any = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [minLon, maxLat],
                [maxLon, maxLat],
                [maxLon, minLat],
                [minLon, minLat],
                [minLon, maxLat],
              ],
            ],
          },
          properties: {
            name: targetRaster.name,
          },
        },
      ],
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as any).setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#2c6671",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#2c6671",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [mapLoaded, map, rasters, fitRasterId]);

  if (!isSupported) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-900 p-6 text-center text-white">
        <div className="max-w-md rounded-lg border border-amber-500/30 bg-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-amber-400">WebGL Not Supported</h3>
          <p className="mt-2 text-sm text-gray-300">
            MapLibre GL requires WebGL. Please enable Hardware Acceleration / WebGL in your browser
            settings on this machine.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Professional Map Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-900/10 backdrop-blur-xs transition-opacity duration-500">
          <div className="animate-fadeIn flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white/90 px-8 py-6 shadow-2xl backdrop-blur-md select-none">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#2c6671]/20 border-t-[#2c6671]"></div>
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-gray-900">Loading Analytics Map</h4>
              <p className="mt-0.5 text-xs font-medium text-[#2c6671]">
                Initializing 3D tile layers & basemap...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
