import JSZip from "jszip";

interface BBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

function blankBBox(): BBox {
  return {
    xmin: Number.POSITIVE_INFINITY,
    ymin: Number.POSITIVE_INFINITY,
    xmax: Number.NEGATIVE_INFINITY,
    ymax: Number.NEGATIVE_INFINITY,
  };
}

function expandBBox(box: BBox, pt: [number, number]): void {
  if (pt[0] < box.xmin) box.xmin = pt[0];
  if (pt[0] > box.xmax) box.xmax = pt[0];
  if (pt[1] < box.ymin) box.ymin = pt[1];
  if (pt[1] > box.ymax) box.ymax = pt[1];
}

interface DBFField {
  name: string;
  type: "C" | "N";
  size: number;
  decimals: number;
}

function createDBFBuffer(
  records: Array<Record<string, string | number | null | undefined>>,
): ArrayBuffer {
  // Infer fields from records
  const fieldMap: Record<string, { type: "C" | "N"; maxLen: number }> = {};

  records.forEach((row) => {
    Object.entries(row).forEach(([key, val]) => {
      const cleanKey = key.slice(0, 10);
      if (!fieldMap[cleanKey]) {
        fieldMap[cleanKey] = {
          type: typeof val === "number" ? "N" : "C",
          maxLen: typeof val === "number" ? 18 : 30,
        };
      }
      if (typeof val === "string" && val.length > fieldMap[cleanKey].maxLen) {
        fieldMap[cleanKey].maxLen = Math.min(254, Math.max(fieldMap[cleanKey].maxLen, val.length));
      }
    });
  });

  const fields: DBFField[] = Object.entries(fieldMap).map(([name, info]) => ({
    name,
    type: info.type,
    size: info.type === "N" ? 18 : Math.min(254, Math.max(10, info.maxLen)),
    decimals: info.type === "N" ? 4 : 0,
  }));

  const recordLen = 1 + fields.reduce((sum, f) => sum + f.size, 0);
  const headerLen = 32 + fields.length * 32 + 1;
  const totalLen = headerLen + records.length * recordLen + 1;

  const buffer = new ArrayBuffer(totalLen);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const now = new Date();
  view.setUint8(0, 0x03); // dBase III
  view.setUint8(1, now.getFullYear() - 1900);
  view.setUint8(2, now.getMonth() + 1);
  view.setUint8(3, now.getDate());
  view.setUint32(4, records.length, true); // num records
  view.setUint16(8, headerLen, true);
  view.setUint16(10, recordLen, true);

  // Field descriptors
  fields.forEach((field, i) => {
    const offset = 32 + i * 32;
    for (let c = 0; c < 11; c++) {
      view.setUint8(offset + c, c < field.name.length ? field.name.charCodeAt(c) : 0);
    }
    view.setUint8(offset + 11, field.type.charCodeAt(0));
    view.setUint8(offset + 16, field.size);
    view.setUint8(offset + 17, field.decimals);
  });

  // Header terminator
  view.setUint8(headerLen - 1, 0x0d);

  // Records
  let offset = headerLen;
  records.forEach((row) => {
    bytes[offset] = 0x20; // active record (not deleted)
    offset++;

    fields.forEach((field) => {
      const val = row[field.name];
      let str = "";
      if (val !== undefined && val !== null) {
        if (field.type === "N" && typeof val === "number") {
          str = val.toFixed(field.decimals).padStart(field.size, " ");
        } else {
          str = String(val).padEnd(field.size, " ");
        }
      } else {
        str = "".padEnd(field.size, " ");
      }

      for (let c = 0; c < field.size; c++) {
        bytes[offset + c] = c < str.length ? str.charCodeAt(c) : 0x20;
      }
      offset += field.size;
    });
  });

  // EOF marker
  bytes[offset] = 0x1a;

  return buffer;
}

/**
 * Creates .shp and .shx buffers for Polygon or MultiPolygon features
 */
function createPolygonShapeBuffers(features: Array<{ coordinates: number[][][] | number[][][][] }>): {
  shp: ArrayBuffer;
  shx: ArrayBuffer;
} {
  const fileBox = blankBBox();

  // Normalize each feature to an array of parts (rings)
  const normalizedFeatures = features.map((f) => {
    const raw = f.coordinates;
    let parts: number[][][] = [];
    if (Array.isArray(raw[0]?.[0]?.[0])) {
      // MultiPolygon: number[][][][]
      (raw as number[][][][]).forEach((poly) => {
        parts = parts.concat(poly);
      });
    } else {
      // Polygon: number[][][]
      parts = raw as number[][][];
    }

    const featureBox = blankBBox();
    const allPoints: [number, number][] = [];
    const partIndices: number[] = [];

    parts.forEach((ring) => {
      partIndices.push(allPoints.length);
      ring.forEach((pt) => {
        const coord: [number, number] = [pt[0], pt[1]];
        allPoints.push(coord);
        expandBBox(featureBox, coord);
        expandBBox(fileBox, coord);
      });
    });

    return {
      box: featureBox,
      partIndices,
      points: allPoints,
    };
  });

  // Calculate lengths
  // Header is 100 bytes.
  // Each record in SHP has 8 byte record header + content:
  // content = 4 (shape type) + 32 (box) + 4 (numParts) + 4 (numPoints) + parts.length * 4 + points.length * 16
  let totalShpBytes = 100;
  const recordLengths: number[] = [];

  normalizedFeatures.forEach((feat) => {
    const contentBytes = 44 + feat.partIndices.length * 4 + feat.points.length * 16;
    recordLengths.push(contentBytes);
    totalShpBytes += 8 + contentBytes;
  });

  const totalShxBytes = 100 + normalizedFeatures.length * 8;

  const shpBuffer = new ArrayBuffer(totalShpBytes);
  const shpView = new DataView(shpBuffer);
  const shxBuffer = new ArrayBuffer(totalShxBytes);
  const shxView = new DataView(shxBuffer);

  // Write SHP Header
  shpView.setInt32(0, 9994, false); // File code Big Endian
  shpView.setInt32(24, totalShpBytes / 2, false); // File length in 16-bit words Big Endian
  shpView.setInt32(28, 1000, true); // Version Little Endian
  shpView.setInt32(32, 5, true); // Shape Type: 5 (Polygon) Little Endian
  shpView.setFloat64(36, fileBox.xmin === Number.POSITIVE_INFINITY ? 0 : fileBox.xmin, true);
  shpView.setFloat64(44, fileBox.ymin === Number.POSITIVE_INFINITY ? 0 : fileBox.ymin, true);
  shpView.setFloat64(52, fileBox.xmax === Number.NEGATIVE_INFINITY ? 0 : fileBox.xmax, true);
  shpView.setFloat64(60, fileBox.ymax === Number.NEGATIVE_INFINITY ? 0 : fileBox.ymax, true);

  // Write SHX Header
  shxView.setInt32(0, 9994, false);
  shxView.setInt32(24, totalShxBytes / 2, false);
  shxView.setInt32(28, 1000, true);
  shxView.setInt32(32, 5, true);
  shxView.setFloat64(36, fileBox.xmin === Number.POSITIVE_INFINITY ? 0 : fileBox.xmin, true);
  shxView.setFloat64(44, fileBox.ymin === Number.POSITIVE_INFINITY ? 0 : fileBox.ymin, true);
  shxView.setFloat64(52, fileBox.xmax === Number.NEGATIVE_INFINITY ? 0 : fileBox.xmax, true);
  shxView.setFloat64(60, fileBox.ymax === Number.NEGATIVE_INFINITY ? 0 : fileBox.ymax, true);

  // Write Records
  let shpOffset = 100;
  let shxOffset = 100;

  normalizedFeatures.forEach((feat, i) => {
    const contentBytes = recordLengths[i];
    const contentWords = contentBytes / 2;

    // SHX entry
    shxView.setInt32(shxOffset, shpOffset / 2, false); // Offset in words Big Endian
    shxView.setInt32(shxOffset + 4, contentWords, false); // Length in words Big Endian
    shxOffset += 8;

    // SHP record header
    shpView.setInt32(shpOffset, i + 1, false); // Record number Big Endian
    shpView.setInt32(shpOffset + 4, contentWords, false); // Content length Big Endian

    // SHP record content
    shpView.setInt32(shpOffset + 8, 5, true); // Shape type: Polygon Little Endian
    shpView.setFloat64(shpOffset + 12, feat.box.xmin, true);
    shpView.setFloat64(shpOffset + 20, feat.box.ymin, true);
    shpView.setFloat64(shpOffset + 28, feat.box.xmax, true);
    shpView.setFloat64(shpOffset + 36, feat.box.ymax, true);
    shpView.setInt32(shpOffset + 44, feat.partIndices.length, true); // NumParts
    shpView.setInt32(shpOffset + 48, feat.points.length, true); // NumPoints

    // Parts array
    feat.partIndices.forEach((partIdx, p) => {
      shpView.setInt32(shpOffset + 52 + p * 4, partIdx, true);
    });

    // Points array
    const pointsStart = shpOffset + 52 + feat.partIndices.length * 4;
    feat.points.forEach((pt, ptIdx) => {
      shpView.setFloat64(pointsStart + ptIdx * 16, pt[0], true);
      shpView.setFloat64(pointsStart + ptIdx * 16 + 8, pt[1], true);
    });

    shpOffset += 8 + contentBytes;
  });

  return { shp: shpBuffer, shx: shxBuffer };
}

/**
 * Creates .shp and .shx buffers for Point features
 */
function createPointShapeBuffers(features: Array<{ coordinates: [number, number] }>): {
  shp: ArrayBuffer;
  shx: ArrayBuffer;
} {
  const fileBox = blankBBox();
  features.forEach((f) => expandBBox(fileBox, f.coordinates));

  const totalShpBytes = 100 + features.length * (8 + 20); // 8 header + 20 content
  const totalShxBytes = 100 + features.length * 8;

  const shpBuffer = new ArrayBuffer(totalShpBytes);
  const shpView = new DataView(shpBuffer);
  const shxBuffer = new ArrayBuffer(totalShxBytes);
  const shxView = new DataView(shxBuffer);

  // Headers
  shpView.setInt32(0, 9994, false);
  shpView.setInt32(24, totalShpBytes / 2, false);
  shpView.setInt32(28, 1000, true);
  shpView.setInt32(32, 1, true); // Point = 1
  shpView.setFloat64(36, fileBox.xmin === Number.POSITIVE_INFINITY ? 0 : fileBox.xmin, true);
  shpView.setFloat64(44, fileBox.ymin === Number.POSITIVE_INFINITY ? 0 : fileBox.ymin, true);
  shpView.setFloat64(52, fileBox.xmax === Number.NEGATIVE_INFINITY ? 0 : fileBox.xmax, true);
  shpView.setFloat64(60, fileBox.ymax === Number.NEGATIVE_INFINITY ? 0 : fileBox.ymax, true);

  shxView.setInt32(0, 9994, false);
  shxView.setInt32(24, totalShxBytes / 2, false);
  shxView.setInt32(28, 1000, true);
  shxView.setInt32(32, 1, true);
  shxView.setFloat64(36, fileBox.xmin === Number.POSITIVE_INFINITY ? 0 : fileBox.xmin, true);
  shxView.setFloat64(44, fileBox.ymin === Number.POSITIVE_INFINITY ? 0 : fileBox.ymin, true);
  shxView.setFloat64(52, fileBox.xmax === Number.NEGATIVE_INFINITY ? 0 : fileBox.xmax, true);
  shxView.setFloat64(60, fileBox.ymax === Number.NEGATIVE_INFINITY ? 0 : fileBox.ymax, true);

  let shpOffset = 100;
  let shxOffset = 100;

  features.forEach((feat, i) => {
    shxView.setInt32(shxOffset, shpOffset / 2, false);
    shxView.setInt32(shxOffset + 4, 10, false); // 20 bytes / 2
    shxOffset += 8;

    shpView.setInt32(shpOffset, i + 1, false);
    shpView.setInt32(shpOffset + 4, 10, false);
    shpView.setInt32(shpOffset + 8, 1, true); // Point
    shpView.setFloat64(shpOffset + 12, feat.coordinates[0], true);
    shpView.setFloat64(shpOffset + 20, feat.coordinates[1], true);
    shpOffset += 28;
  });

  return { shp: shpBuffer, shx: shxBuffer };
}

export interface GeoJSONFeatureForExport {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, string | number | null | undefined>;
}

/**
 * Builds a valid ESRI Shapefile ZIP Blob containing .shp, .shx, .dbf, .prj, and .cpg files.
 */
export async function createShapefileZip(
  features: GeoJSONFeatureForExport[],
  baseName = "selected_aoi",
): Promise<Blob> {
  if (!features || features.length === 0) {
    throw new Error("No features provided for shapefile export.");
  }

  const zip = new JSZip();

  // Group features by geometry category (Polygons vs Points vs Lines)
  const polygons: Array<{ coordinates: any; properties: any }> = [];
  const points: Array<{ coordinates: any; properties: any }> = [];

  features.forEach((f) => {
    const type = f.geometry?.type;
    if (type === "Polygon" || type === "MultiPolygon") {
      polygons.push({
        coordinates: f.geometry.coordinates,
        properties: f.properties || {},
      });
    } else if (type === "Point" || type === "MultiPoint") {
      points.push({
        coordinates: f.geometry.coordinates,
        properties: f.properties || {},
      });
    }
  });

  // Default to polygon shapefile if any polygons, or point shapefile
  if (polygons.length > 0) {
    const { shp, shx } = createPolygonShapeBuffers(polygons);
    const dbf = createDBFBuffer(polygons.map((p) => p.properties));

    zip.file(`${baseName}.shp`, shp);
    zip.file(`${baseName}.shx`, shx);
    zip.file(`${baseName}.dbf`, dbf);
    zip.file(`${baseName}.prj`, WGS84_PRJ);
    zip.file(`${baseName}.cpg`, "UTF-8");
  } else if (points.length > 0) {
    const { shp, shx } = createPointShapeBuffers(points);
    const dbf = createDBFBuffer(points.map((p) => p.properties));

    zip.file(`${baseName}.shp`, shp);
    zip.file(`${baseName}.shx`, shx);
    zip.file(`${baseName}.dbf`, dbf);
    zip.file(`${baseName}.prj`, WGS84_PRJ);
    zip.file(`${baseName}.cpg`, "UTF-8");
  } else {
    // If other geometries (e.g. bounding box or linestring), treat outer rings as polygon
    throw new Error("Unsupported shapefile geometry types in the selected layers.");
  }

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
  });
}
