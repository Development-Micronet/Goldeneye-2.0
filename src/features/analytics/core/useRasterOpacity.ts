// hooks/useRasterOpacity.ts
import { useCallback, useState } from "react";
import { useRasterStore } from "../store/useRasterStore";
import { getMapInstance, rasterLayerId } from "../utils/mapRegistry";

/**
 * Local opacity state for one raster.
 * `preview` paints straight to the map (no store write, no layer rebuild).
 * `commit` persists the final value once the user lets go.
 */
export const useRasterOpacity = (rasterId: string, initial = 1) => {
  const [opacity, setOpacity] = useState(initial);
  const updateRaster = useRasterStore((s) => s.updateRaster);

  const preview = useCallback(
    (value: number) => {
      setOpacity(value);

      const map = getMapInstance();
      const layerId = rasterLayerId(rasterId);
      if (map?.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", value);
      }
    },
    [rasterId],
  );

  const commit = useCallback(
    () => updateRaster(rasterId, { opacity }),
    [rasterId, opacity, updateRaster],
  );

  return { opacity, preview, commit };
};
