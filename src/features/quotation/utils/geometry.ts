import * as turf from "@turf/turf";

interface GeometryParams {
  type: string;
  coordinates: any;
}

export function getGeometryDimensions({ type, coordinates }: GeometryParams): {
  width: string;
  height: string;
} {
  let bbox: any;
  if (type === "Polygon") {
    bbox = turf.bbox(turf.polygon([coordinates[0] || coordinates]));
  } else if (type === "LineString") {
    bbox = turf.bbox(turf.lineString(coordinates));
  } else if (type === "Point") {
    bbox = turf.bbox(turf.point(coordinates));
  } else {
    return { width: "0.00", height: "0.00" };
  }

  const [minX, minY, maxX, maxY] = bbox;
  const width = turf.distance([minX, minY], [maxX, minY], { units: "kilometers" });
  const height = turf.distance([minX, minY], [minX, maxY], { units: "kilometers" });

  return {
    width: width.toFixed(2),
    height: height.toFixed(2),
  };
}

export function getRectangleDimensions(coordinates: any): { width: string; height: string } {
  const corners = coordinates[0];
  if (!corners || corners.length < 4) return { width: "0.00", height: "0.00" };

  const width = turf.distance(corners[0], corners[1], { units: "kilometers" });
  const height = turf.distance(corners[1], corners[2], { units: "kilometers" });

  return {
    width: width.toFixed(2),
    height: height.toFixed(2),
  };
}
