import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { useMapStore } from "../store/useMapStore";
import { useRasterLayers } from "../core/useRasterLayers";
import { useLayerSync } from "../core/useLayerSync";
import "maplibre-gl/dist/maplibre-gl.css";

import { sanitizeMapStyle } from "../utils/sanitizeStyle";
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
          map.setLayoutProperty(
            layer.id,
            "visibility",
            mapType === "3d" ? "visible" : "none"
          );
        }
        if (layer.type === "raster") {
          map.setLayoutProperty(
            layer.id,
            "visibility",
            mapType === "3d" ? "visible" : "none"
          );
        }
        if (layer.type === "line") {
          map.setLayoutProperty(
            layer.id,
            "visibility",
            mapType === "3d" ? "visible" : "none"
          );

          map.setPaintProperty(
            layer.id,
            "line-color",
            mapType === "3d" ? "#00000073" : "#ffffff"
          );
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
  // usebuildingcolor()

  if (!isSupported) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-900 p-6 text-center text-white">
        <div className="max-w-md rounded-lg border border-amber-500/30 bg-gray-800 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-amber-400">WebGL Not Supported</h3>
          <p className="mt-2 text-sm text-gray-300">
            MapLibre GL requires WebGL. Please enable Hardware Acceleration / WebGL in your browser settings on this machine.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
}