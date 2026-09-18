import type { DrawnLayer } from "../store/useLayersStore";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import { getArea } from "ol/sphere";
import JSZip from "jszip";
import shp from "shpjs";
import { logger } from "../utils/logger";

export interface ShpCompanionFiles {
  dbf?: ArrayBuffer;
  prj?: string;
  cpg?: string;
}

export interface ParseGeospatialOptions {
  shpCompanionFiles?: ShpCompanionFiles;
}

/**
 * Parses geospatial file content (GeoJSON, KML, KMZ, or Shapefile) and extracts layer representations.
 * Supports:
 * - GeoJSON (.json, .geojson): FeatureCollection, single Feature, or Geometry objects
 * - KML (.kml): XML string
 * - KMZ (.kmz): Zipped KML archive (extracts doc.kml or any .kml files)
 * - Shapefile (.shp, .zip): Standalone .shp, companion .shp+.dbf+.prj, or zipped Shapefile
 * Computes geodesic area in square kilometers for Polygons/MultiPolygons.
 * Extends the label from feature properties if available.
 *
 * @param content The file content as a string (for text formats) or ArrayBuffer (for binary/compressed formats).
 * @param fileName The name of the imported file for format detection and fallback naming.
 * @param options Optional companion files (e.g. .dbf, .prj) for shapefiles.
 * @returns Array of layer data configurations ready for insertion into layers store.
 */
export async function parseGeospatialFile(
  content: string | ArrayBuffer,
  fileName: string,
  options?: ParseGeospatialOptions,
): Promise<Omit<DrawnLayer, "id">[]> {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  let features: Feature[] = [];

  if (ext === ".kml") {
    const textContent =
      typeof content === "string" ? content : new TextDecoder().decode(content);
    try {
      const kmlFormat = new KML({ extractStyles: false });
      features = kmlFormat.readFeatures(textContent) as Feature[];
    } catch (err) {
      throw new Error("Invalid KML format. Please check the file formatting.");
    }
  } else if (ext === ".kmz") {
    try {
      const buffer =
        typeof content === "string" ? new TextEncoder().encode(content).buffer : content;
      const zip = await JSZip.loadAsync(buffer);
      const kmlEntries = Object.keys(zip.files).filter(
        (name) => !zip.files[name].dir && name.toLowerCase().endsWith(".kml"),
      );

      if (kmlEntries.length === 0) {
        throw new Error("No .kml file found inside the KMZ archive.");
      }

      const kmlFormat = new KML({ extractStyles: false });
      for (const entry of kmlEntries) {
        try {
          const kmlText = await zip.files[entry].async("text");
          const kmlFeats = kmlFormat.readFeatures(kmlText) as Feature[];
          if (kmlFeats && kmlFeats.length > 0) {
            features.push(...kmlFeats);
          }
        } catch (entryErr) {
          logger.warn(`Failed to parse KML entry "${entry}" in KMZ:`, entryErr);
        }
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to unpack or parse KMZ file.");
    }
  } else if (ext === ".shp") {
    if (typeof content === "string") {
      throw new Error("Shapefile (.shp) must be loaded as binary data.");
    }

    try {
      let geojsonResult: any;
      if (options?.shpCompanionFiles?.dbf || options?.shpCompanionFiles?.prj) {
        geojsonResult = await (shp as any)({
          shp: content,
          dbf: options.shpCompanionFiles.dbf,
          prj: options.shpCompanionFiles.prj,
          cpg: options.shpCompanionFiles.cpg,
        });
      } else {
        try {
          geojsonResult = await (shp as any)({ shp: content });
        } catch {
          const geoms = shp.parseShp(content);
          geojsonResult = {
            type: "FeatureCollection",
            features: geoms.map((geom: any) => ({
              type: "Feature",
              geometry: geom,
              properties: {},
            })),
          };
        }
      }

      const collections = Array.isArray(geojsonResult) ? geojsonResult : [geojsonResult];
      const geojsonFormat = new GeoJSON();
      for (const col of collections) {
        if (col && col.features) {
          const feats = geojsonFormat.readFeatures(col) as Feature[];
          features.push(...feats);
        }
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to parse Shapefile (.shp).");
    }
  } else if (ext === ".zip") {
    try {
      const buffer =
        typeof content === "string" ? new TextEncoder().encode(content).buffer : content;
      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

      const hasShp = fileNames.some((n) => n.toLowerCase().endsWith(".shp"));
      const hasKml = fileNames.some((n) => n.toLowerCase().endsWith(".kml"));
      const hasGeoJson = fileNames.some(
        (n) => n.toLowerCase().endsWith(".geojson") || n.toLowerCase().endsWith(".json"),
      );

      if (hasShp) {
        const geojsonResult = await (shp as any)(buffer);
        const collections = Array.isArray(geojsonResult) ? geojsonResult : [geojsonResult];
        const geojsonFormat = new GeoJSON();
        for (const col of collections) {
          if (col && col.features) {
            const feats = geojsonFormat.readFeatures(col) as Feature[];
            features.push(...feats);
          }
        }
      } else if (hasKml) {
        const kmlFormat = new KML({ extractStyles: false });
        for (const name of fileNames.filter((n) => n.toLowerCase().endsWith(".kml"))) {
          const kmlText = await zip.files[name].async("text");
          const feats = kmlFormat.readFeatures(kmlText) as Feature[];
          features.push(...feats);
        }
      } else if (hasGeoJson) {
        const geojsonFormat = new GeoJSON();
        for (const name of fileNames.filter(
          (n) => n.toLowerCase().endsWith(".geojson") || n.toLowerCase().endsWith(".json"),
        )) {
          const jsonText = await zip.files[name].async("text");
          const obj = JSON.parse(jsonText);
          const feats = geojsonFormat.readFeatures(obj) as Feature[];
          features.push(...feats);
        }
      } else {
        throw new Error(
          "No supported geospatial files (.shp, .kml, .geojson, .json) found in the ZIP archive.",
        );
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to process ZIP archive.");
    }
  } else if (ext === ".json" || ext === ".geojson") {
    const textContent =
      typeof content === "string" ? content : new TextDecoder().decode(content);
    const geojsonFormat = new GeoJSON();
    let obj: any;
    try {
      obj = JSON.parse(textContent);
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
      `Unsupported file type: ${ext}. Currently supporting .shp, .zip, .kml, .kmz, .json, and .geojson.`,
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

    // Retrieve label from common metadata fields (case-insensitive), or use indexed filename fallback
    const props = feature.getProperties() || {};
    const properties = { ...props };
    delete properties.geometry; // Clean geometry reference

    let labelVal: string | null = null;
    const commonLabelKeys = [
      "name",
      "label",
      "title",
      "id",
      "fid",
      "layer",
      "aoi",
      "feature_id",
      "objectid",
    ];

    for (const key of commonLabelKeys) {
      for (const [propKey, propVal] of Object.entries(properties)) {
        if (
          propKey.toLowerCase() === key &&
          propVal !== undefined &&
          propVal !== null &&
          String(propVal).trim() !== ""
        ) {
          labelVal = String(propVal).trim();
          break;
        }
      }
      if (labelVal) break;
    }

    if (!labelVal) {
      labelVal = features.length === 1 ? baseName : `${baseName}_${index + 1}`;
    }

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
