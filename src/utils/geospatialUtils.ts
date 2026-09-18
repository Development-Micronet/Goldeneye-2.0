import type { DrawnLayer } from "../store/useLayersStore";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import { getArea } from "ol/sphere";
import proj4 from "proj4";
import { logger } from "./logger";

export interface ShpCompanionFiles {
  dbf?: ArrayBuffer;
  prj?: string;
  cpg?: string;
}

export interface ParseGeospatialOptions {
  shpCompanionFiles?: ShpCompanionFiles;
}

/**
 * Normalizes geometry coordinates to standard WGS84 (EPSG:4326).
 * Handles:
 * 1. PRJ WKT conversion (if PRJ provided).
 * 2. Automatic detection and conversion of Web Mercator meters (EPSG:3857).
 * 3. Automatic detection and swap of inverted latitude/longitude coordinates.
 */
function normalizeCoordinatesToWGS84(geom: any, prjString?: string): void {
  if (!geom || !geom.coordinates) return;

  // 1. If PRJ WKT string is provided, try converting with proj4
  if (prjString && typeof prjString === "string" && prjString.trim()) {
    try {
      const transform = proj4(prjString.trim(), "EPSG:4326");
      const transformCoord = (coords: any): any => {
        if (
          Array.isArray(coords) &&
          coords.length >= 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number"
        ) {
          const [lon, lat] = transform.forward([coords[0], coords[1]]);
          return [lon, lat, ...coords.slice(2)];
        }
        if (Array.isArray(coords)) {
          return coords.map(transformCoord);
        }
        return coords;
      };
      geom.coordinates = transformCoord(geom.coordinates);
      return;
    } catch (err) {
      logger.warn("Could not transform coordinates using PRJ string:", err);
    }
  }

  // Find a sample coordinate [x, y] to inspect magnitude
  let sampleCoord: [number, number] | null = null;
  const findSample = (coords: any): void => {
    if (sampleCoord) return;
    if (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      sampleCoord = [coords[0], coords[1]];
    } else if (Array.isArray(coords)) {
      for (const item of coords) {
        findSample(item);
        if (sampleCoord) return;
      }
    }
  };
  findSample(geom.coordinates);

  if (!sampleCoord) return;

  const [x, y] = sampleCoord;

  // 2. Check if coordinates are projected meters (e.g. Web Mercator EPSG:3857)
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    if (Math.abs(x) <= 20037508.34 && Math.abs(y) <= 20048966.1) {
      const transformCoord = (coords: any): any => {
        if (
          Array.isArray(coords) &&
          coords.length >= 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number"
        ) {
          try {
            const [lon, lat] = proj4("EPSG:3857", "EPSG:4326", [coords[0], coords[1]]);
            return [lon, lat, ...coords.slice(2)];
          } catch {
            return coords;
          }
        }
        if (Array.isArray(coords)) {
          return coords.map(transformCoord);
        }
        return coords;
      };
      geom.coordinates = transformCoord(geom.coordinates);
      return;
    }
  }

  // 3. Check if coordinates are swapped [latitude, longitude] instead of [longitude, latitude]
  // In India: Latitude is between 5 and 38, Longitude is between 65 and 100
  if (x >= 5 && x <= 40 && y >= 65 && y <= 100) {
    const swapCoord = (coords: any): any => {
      if (
        Array.isArray(coords) &&
        coords.length >= 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number"
      ) {
        return [coords[1], coords[0], ...coords.slice(2)];
      }
      if (Array.isArray(coords)) {
        return coords.map(swapCoord);
      }
      return coords;
    };
    geom.coordinates = swapCoord(geom.coordinates);
  }
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
      const { default: JSZip } = await import("jszip");
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
      const { parseShp, parseDbf, combine } = await import("shpjs");
      const buffer =
        content instanceof ArrayBuffer
          ? content
          : (content as any).buffer instanceof ArrayBuffer
            ? (content as any).buffer
            : content;

      let geoms: any[] = [];
      try {
        geoms = parseShp(buffer, options?.shpCompanionFiles?.prj);
      } catch (parseErr: any) {
        logger.error("Error parsing SHP buffer:", parseErr);
        throw new Error(
          parseErr.message || "Failed to parse shapefile geometry records.",
        );
      }

      if (!geoms || geoms.length === 0) {
        throw new Error("No shapefile geometries found in the .shp file.");
      }

      // Filter out any null or empty geometries
      const validGeoms = geoms.filter(
        (g: any) => g && g.type && g.coordinates && g.coordinates.length > 0,
      );
      if (validGeoms.length === 0) {
        throw new Error("No valid geometry records found in the .shp file.");
      }

      // Check and normalize coordinates to EPSG:4326 (WGS84) if projected
      validGeoms.forEach((geom: any) => {
        normalizeCoordinatesToWGS84(geom, options?.shpCompanionFiles?.prj);
      });

      let dbfRows: any[] = [];
      if (options?.shpCompanionFiles?.dbf) {
        try {
          dbfRows = parseDbf(
            options.shpCompanionFiles.dbf,
            options.shpCompanionFiles.cpg,
          );
        } catch (dbfErr) {
          logger.warn("Could not parse DBF attributes:", dbfErr);
        }
      }

      const geojsonResult = combine([validGeoms, dbfRows]);
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
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

      const hasShp = fileNames.some((n) => n.toLowerCase().endsWith(".shp"));
      const hasKml = fileNames.some((n) => n.toLowerCase().endsWith(".kml"));
      const hasGeoJson = fileNames.some(
        (n) => n.toLowerCase().endsWith(".geojson") || n.toLowerCase().endsWith(".json"),
      );

      if (hasShp) {
        const { parseZip } = await import("shpjs");
        const geojsonResult = await parseZip(buffer);
        const collections = Array.isArray(geojsonResult) ? geojsonResult : [geojsonResult];
        const geojsonFormat = new GeoJSON();
        for (const col of collections) {
          if (col && col.features) {
            col.features.forEach((feat: any) => {
              if (feat && feat.geometry) {
                normalizeCoordinatesToWGS84(feat.geometry);
              }
            });
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
        if (!isNaN(calculatedArea)) {
          area = calculatedArea / 1000000;
        }
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
    if (!geojson.properties) {
      geojson.properties = {};
    }
    geojson.properties.name = labelVal;
    geojson.properties.id = properties.id || properties.ID || undefined;
    geojson.properties.label = labelVal;

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
