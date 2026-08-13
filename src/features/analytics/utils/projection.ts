import proj4 from "proj4";
import type { LngLatBoundsLike } from "maplibre-gl";

export function utmToLngLatBounds(aoi: number[], projection = "EPSG:32643"): LngLatBoundsLike {
  let sourceProjection = projection;

  // protect against wrong EPSG metadata
  if (projection === "EPSG:4326" && (Math.abs(aoi[0]) > 180 || Math.abs(aoi[1]) > 90)) {
    sourceProjection = "EPSG:32643";
  }

  const min = proj4(sourceProjection, "EPSG:4326", [aoi[0], aoi[1]]);

  const max = proj4(sourceProjection, "EPSG:4326", [aoi[2], aoi[3]]);

  return [
    [min[0], min[1]],
    [max[0], max[1]],
  ] as [[number, number], [number, number]];
}
function isLikelyUTM(aoi: number[]) {
  return (
    Math.abs(aoi[0]) > 180 ||
    Math.abs(aoi[1]) > 90 ||
    Math.abs(aoi[2]) > 180 ||
    Math.abs(aoi[3]) > 90
  );
}

export function convertAOI(aoi: number[], projection = "EPSG:32643") {
  let sourceProjection = projection;

  if (projection === "EPSG:4326" && isLikelyUTM(aoi)) {
    console.warn("Invalid EPSG:4326 AOI detected. Using EPSG:32643");

    sourceProjection = "EPSG:32643";
  }

  const bottomLeft = proj4(sourceProjection, "EPSG:4326", [aoi[0], aoi[1]]);

  const topRight = proj4(sourceProjection, "EPSG:4326", [aoi[2], aoi[3]]);

  return {
    west: bottomLeft[0],
    south: bottomLeft[1],
    east: topRight[0],
    north: topRight[1],
  };
}
