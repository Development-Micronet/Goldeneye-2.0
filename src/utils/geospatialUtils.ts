import type { DrawnLayer } from "../store/useLayersStore";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import { getArea } from "ol/sphere";
import { logger } from "../utils/logger";

/**
 * Parses geospatial file content string (GeoJSON or KML) and extracts layer representation.
 * Supports FeatureCollection, single Feature, and raw Geometry objects for GeoJSON,
 * and XML string for KML.
 * Computes geodesic area in square kilometers for Polygons/MultiPolygons.
 * Extends the label from feature properties if available.
 *
 * @param content The file content string.
 * @param fileName The name of the imported file for format detection and fallback naming.
 * @returns Array of layer data configurations ready for insertion into layers store.
 */
export function parseGeospatialFile(content: string, fileName: string): Omit<DrawnLayer, "id">[] {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  let features: Feature[] = [];

  if (ext === ".kml") {
    try {
      const kmlFormat = new KML({ extractStyles: false });
      features = kmlFormat.readFeatures(content) as Feature[];
    } catch (err) {
      throw new Error("Invalid KML format. Please check the file formatting.");
    }
  } else if (ext === ".json" || ext === ".geojson") {
    const geojsonFormat = new GeoJSON();
    let obj: any;
    try {
      obj = JSON.parse(content);
    } catch (err) {
      throw new Error("Invalid JSON format. Please upload a valid JSON/GeoJSON file.");
    }

    try {
      if (obj.type === "FeatureCollection") {
        features = geojsonFormat.readFeatures(obj) as Feature[];
      } else if (obj.type === "Feature") {
        const feature = geojsonFormat.readFeature(obj) as Feature;
        if (feature) {
          features = [feature];
        }
      } else if (
        [
          "Point",
          "MultiPoint",
          "LineString",
          "MultiLineString",
          "Polygon",
          "MultiPolygon",
          "GeometryCollection",
        ].includes(obj.type)
      ) {
        const geometry = geojsonFormat.readGeometry(obj);
        if (geometry) {
          const feature = new Feature(geometry);
          features = [feature];
        }
      } else {
        // Fallback try
        features = geojsonFormat.readFeatures(obj) as Feature[];
      }
    } catch (err) {
      throw new Error("Failed to parse GeoJSON structure. Please check the file formatting.");
    }
  } else {
    throw new Error(
      `Unsupported file type: ${ext}. Currently supporting .json, .geojson, and .kml.`,
    );
  }

  if (features.length === 0) {
    throw new Error(`No valid features or geometries found in the ${ext.toUpperCase()} file.`);
  }

  const layers: Omit<DrawnLayer, "id">[] = [];
  const baseName = fileName.replace(/\.[^/.]+$/, ""); // Strip file extension
  const geojsonFormatForExport = new GeoJSON();

  features.forEach((feature, index) => {
    const geometry = feature.getGeometry();
    if (!geometry) return;

    const geomType = geometry.getType();
    let type: DrawnLayer["type"] | null = null;
    let area: number | undefined = undefined;

    // Map OpenLayers geometry type to our store layer types
    if (geomType === "Point" || geomType === "MultiPoint") {
      type = "Point";
    } else if (
      geomType === "LineString" ||
      geomType === "MultiLineString" ||
      geomType === "LinearRing"
    ) {
      type = "Polyline";
    } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
      type = "Polygon";
      try {
        // Calculate geodesic area in square meters, divide by 10^6 to get sqkm
        const calculatedArea = getArea(geometry, { projection: "EPSG:4326" });
        area = calculatedArea / 1000000;
      } catch (err) {
        logger.error("Error calculating geodesic area for imported feature:", err);
      }
    }

    if (!type) {
      logger.warn(`Skipping unsupported geometry type during import: ${geomType}`);
      return;
    }

    // Retrieve label from common metadata fields, or use indexed filename fallback
    const props = feature.getProperties() || {};
    const properties = { ...props };
    delete properties.geometry; // Clean geometry reference

    const labelVal =
      properties.name ||
      properties.label ||
      properties.title ||
      properties.id ||
      (features.length === 1 ? baseName : `${baseName}_${index + 1}`);
    // Standardize feature properties and structure back to GeoJSON object
    const geojson = geojsonFormatForExport.writeFeatureObject(feature);

    layers.push({
      label: String(labelVal).trim(),
      type,
      geojson,
      area,
      visible: true,
    });
  });

  return layers;
}
