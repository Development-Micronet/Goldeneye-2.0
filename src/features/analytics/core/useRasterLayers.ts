import { useEffect, useRef } from "react";
import type { Map, ImageSource } from "maplibre-gl";
import { useRasterStore } from "../store/useRasterStore";
import { convertAOI, utmToLngLatBounds } from "../utils/projection";

export const useRasterLayers = (map: Map | null) => {
  const rasters = useRasterStore((state) => state.rasters);
  const fitRasterId = useRasterStore((state) => state.fitRasterId);

  // Track which raster IDs have been added to the map so we only remove
  // layers for rasters that have been deleted from the store — not on every
  // rasters state change.
  const addedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(rasters.map((r) => r.id));

    // Remove map layers/sources for rasters that are no longer in the store.
    addedIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        const layerId = `raster-layer-${id}`;
        const sourceId = `raster-source-${id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        addedIdsRef.current.delete(id);
      }
    });

    // Add new layers or update existing ones.
    rasters.forEach((raster) => {
      if (!raster.displayImageUrl || !raster.aoi) return;

      const sourceId = `raster-source-${raster.id}`;
      const layerId = `raster-layer-${raster.id}`;

      const extent = convertAOI(raster.aoi, raster.projection);

      const coordinates: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ] = [
          [extent.west, extent.north],
          [extent.east, extent.north],
          [extent.east, extent.south],
          [extent.west, extent.south],
        ];

      if (map.getSource(sourceId)) {
        // Layer already on map — update image, opacity, and visibility.
        const source = map.getSource(sourceId) as ImageSource;
        source.updateImage({ url: raster.displayImageUrl, coordinates });
        map.setPaintProperty(layerId, "raster-opacity", raster.opacity ?? 1);
        map.setLayoutProperty(
          layerId,
          "visibility",
          raster.visible ? "visible" : "none",
        );
        return;
      }

      // First time this raster appears — add source + layer.
      map.addSource(sourceId, {
        type: "image",
        url: raster.displayImageUrl,
        coordinates,
      });

      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        layout: {
          visibility: raster.visible ? "visible" : "none",
        },
        paint: {
          "raster-opacity": raster.opacity ?? 1,
        },
      });

      addedIdsRef.current.add(raster.id);
    });
  }, [map, rasters]);

  // Zoom to raster when fitRasterId changes
  useEffect(() => {
    if (!map || !fitRasterId) return;

    const raster = rasters.find((r) => r.id === fitRasterId);

    if (!raster?.aoi) {
      console.warn("No raster/AOI", {
        fitRasterId,
        raster,
      });
      return;
    }
    console.log("raster", raster, fitRasterId)
    // if (!raster?.aoi) return;

    const bounds = utmToLngLatBounds(raster.aoi, raster.projection || "EPSG:32643");
    if (
      Number.isFinite(bounds[0][0]) &&
      Number.isFinite(bounds[0][1]) &&
      Number.isFinite(bounds[1][0]) &&
      Number.isFinite(bounds[1][1])
    ) {
      map.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      });
    }
  }, [map, fitRasterId, rasters]);
};
