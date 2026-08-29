import { useEffect } from "react";
import type { Map } from "maplibre-gl";

import { MAP_LAYERS } from "../config/mapLayers";
import { useMapStore } from "../store/useMapStore";

export const useLayerSync = (map: Map | null) => {
  const mapMode = useMapStore((state) => state.mapMode);

  // Listen for style data changes (e.g., when basemap changes) and re-sync layers
  useEffect(() => {
    if (!map) return;

    const sync = () => {
      MAP_LAYERS.forEach((layer) => {
        const layerId = layer.layer.id;
        const sourceId = layer.sourceId;
        const isSelected = layer.id === mapMode;

        // Add source if missing
        if (!map.getSource(sourceId) && layer.tiles && layer.tiles.length > 0) {
          map.addSource(sourceId, {
            type: "raster",
            tiles: layer.tiles,
            tileSize: 256,
            ...(layer.attribution !== undefined && { attribution: layer.attribution }),
          });
        }

        // Add layer if missing, ensuring correct visibility
        if (!map.getLayer(layerId)) {
          if (!map.getSource(sourceId)) return;
          map.addLayer(
            {
              ...layer.layer,
              layout: {
                ...("layout" in layer.layer && layer.layer.layout ? layer.layer.layout : {}),
                visibility: isSelected ? "visible" : "none",
              },
            },
            "building-3d",
          );
        }

        // Update visibility for existing layer
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", isSelected ? "visible" : "none");
        }
      });
    };

    // Run sync immediately if style is loaded; otherwise wait for idle
    if (map.isStyleLoaded()) {
      sync();
    } else {
      map.once("idle", sync);
    }

    // Re‑run sync whenever the style data changes (basemap switch)
    map.on("styledata", sync);

    // Cleanup listeners on unmount
    return () => {
      map.off("idle", sync);
      map.off("styledata", sync);
    };
  }, [map, mapMode]);
};
