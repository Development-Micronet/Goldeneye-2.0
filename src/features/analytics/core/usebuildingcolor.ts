import { useEffect } from "react";
import { useMapStore } from "../store/useMapStore";

export const usebuildingcolor = () => {
  const mapType = useMapStore((state) => state.Maptype);
  const buildingColor = useMapStore((state) => state.buildingColor);
  const map = useMapStore((state) => state.map);
  useEffect(() => {
    if (!map) return;

    const toggleBuildingLayers = () => {
      const style = map.getStyle();

      style.layers?.forEach((layer) => {
        if (layer.type === "fill-extrusion") {
          map.setLayoutProperty(layer.id, "visibility", mapType === "3d" ? "visible" : "none");

          map.setPaintProperty(layer.id, "fill-extrusion-color", buildingColor);

          map.setPaintProperty(layer.id, "fill-extrusion-opacity", 0.9);

          map.setPaintProperty(layer.id, "fill-extrusion-vertical-gradient", false);
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
  }, [map, mapType, buildingColor]);
};
