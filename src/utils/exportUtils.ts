import type { DrawnLayer } from "../store/useLayersStore";
import JSZip from "jszip";
import { createShapefileZip } from "./shapefileWriter";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  downloadBlob(blob, filename);
}

export function getLayersFeatureCollection(layers: DrawnLayer[]) {
  const features = layers
    .map((layer) => {
      let geojson = layer.geojson;
      if (typeof geojson === "string") {
        try {
          geojson = JSON.parse(geojson);
        } catch {
          return null;
        }
      }
      if (!geojson) return null;

      let geometry = geojson.geometry;
      if (
        !geometry &&
        geojson.type &&
        geojson.type !== "Feature" &&
        geojson.type !== "FeatureCollection"
      ) {
        geometry = geojson;
      }
      if (!geometry && geojson.type === "FeatureCollection" && geojson.features?.length > 0) {
        geometry = geojson.features[0]?.geometry;
      }
      if (!geometry) return null;

      // Ensure properties are flat for DBF and GeoJSON compatibility
      const props: Record<string, any> = {
        ...(geojson.properties || {}),
        id: String(layer.id || "").slice(0, 10),
        label: String(layer.label || "AOI").slice(0, 50),
        type: String(layer.type || geometry.type || "").slice(0, 20),
      };
      if (layer.area != null && !isNaN(layer.area)) {
        props.area_sqkm = Number(layer.area.toFixed(4));
      }

      return {
        type: "Feature" as const,
        geometry,
        properties: props,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

export function exportLayersAsGeoJSON(layers: DrawnLayer[], filename = "selected_aoi.geojson") {
  const featureCollection = getLayersFeatureCollection(layers);
  const jsonContent = JSON.stringify(featureCollection, null, 2);
  const outFilename = filename.endsWith(".geojson") ? filename : `${filename}.geojson`;
  downloadFile(jsonContent, outFilename, "application/json");
}

export function generateKMLString(layers: DrawnLayer[]): string {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Selected AOIs</name>
`;

  layers.forEach((layer) => {
    let geojson = layer.geojson;
    if (typeof geojson === "string") {
      try {
        geojson = JSON.parse(geojson);
      } catch {
        return;
      }
    }
    if (!geojson) return;

    let geom = geojson.geometry;
    if (
      !geom &&
      geojson.type &&
      geojson.type !== "Feature" &&
      geojson.type !== "FeatureCollection"
    ) {
      geom = geojson;
    }
    if (!geom && geojson.type === "FeatureCollection" && geojson.features?.length > 0) {
      geom = geojson.features[0]?.geometry;
    }
    if (!geom) return;

    let geomXml = "";
    if (geom.type === "Point") {
      const coords = geom.coordinates;
      geomXml = `        <Point>
          <coordinates>${coords[0]},${coords[1]},0</coordinates>
        </Point>`;
    } else if (geom.type === "LineString") {
      const coords = geom.coordinates.map((c: number[]) => `${c[0]},${c[1]},0`).join(" ");
      geomXml = `        <LineString>
          <coordinates>${coords}</coordinates>
        </LineString>`;
    } else if (geom.type === "Polygon") {
      const rings = geom.coordinates
        .map((ring: number[][]) => {
          const coordsStr = ring.map((c: number[]) => `${c[0]},${c[1]},0`).join(" ");
          return `            <LinearRing>
              <coordinates>${coordsStr}</coordinates>
            </LinearRing>`;
        })
        .join("\n");
      geomXml = `        <Polygon>
          <outerBoundaryIs>
${rings}
          </outerBoundaryIs>
        </Polygon>`;
    } else if (geom.type === "MultiPolygon") {
      const polygonsXml = geom.coordinates
        .map((poly: number[][][]) => {
          const rings = poly
            .map((ring: number[][]) => {
              const coordsStr = ring.map((c: number[]) => `${c[0]},${c[1]},0`).join(" ");
              return `              <LinearRing>
                <coordinates>${coordsStr}</coordinates>
              </LinearRing>`;
            })
            .join("\n");
          return `          <Polygon>
            <outerBoundaryIs>
${rings}
            </outerBoundaryIs>
          </Polygon>`;
        })
        .join("\n");
      geomXml = `        <MultiGeometry>
${polygonsXml}
        </MultiGeometry>`;
    }

    const name = (layer.label || "AOI")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const desc = `Type: ${layer.type || geom.type}${
      layer.area ? `, Area: ${layer.area.toFixed(2)} sqkm` : ""
    }`;

    kml += `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
${geomXml}
    </Placemark>
`;
  });

  kml += `  </Document>
</kml>`;
  return kml;
}

export function exportLayersAsKML(layers: DrawnLayer[], filename = "selected_aoi.kml") {
  const kml = generateKMLString(layers);
  const outFilename = filename.endsWith(".kml") ? filename : `${filename}.kml`;
  downloadFile(kml, outFilename, "application/vnd.google-earth.kml+xml");
}

export async function exportLayersAsKMZ(layers: DrawnLayer[], filename = "selected_aoi.kmz") {
  if (layers.length === 0) {
    throw new Error("No layers to export.");
  }
  const kml = generateKMLString(layers);
  const zip = new JSZip();
  zip.file("doc.kml", kml);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.google-earth.kmz",
    compression: "DEFLATE",
  });
  const outFilename = filename.endsWith(".kmz") ? filename : `${filename}.kmz`;
  downloadBlob(blob, outFilename);
}

export async function exportLayersAsShapefile(
  layers: DrawnLayer[],
  filename = "selected_aoi.zip",
) {
  const featureCollection = getLayersFeatureCollection(layers);
  if (!featureCollection.features || featureCollection.features.length === 0) {
    throw new Error("No valid geometries found in the selected layers to export.");
  }

  const baseName = filename.replace(/\.zip$/i, "") || "selected_aoi";
  const finalBlob = await createShapefileZip(featureCollection.features as any, baseName);

  const outFilename = filename.endsWith(".zip") ? filename : `${filename}.zip`;
  downloadBlob(finalBlob, outFilename);
}

export function exportLayersAsCSV(layers: DrawnLayer[], filename = "selected_aoi.csv") {
  const headers = ["ID", "Label", "Type", "Area (sqkm)", "Coordinates"];
  const rows = layers.map((layer) => {
    let geojson = layer.geojson;
    if (typeof geojson === "string") {
      try {
        geojson = JSON.parse(geojson);
      } catch {
        geojson = {};
      }
    }
    const coords = JSON.stringify(geojson?.geometry?.coordinates || geojson?.coordinates || []);
    return [
      layer.id,
      layer.label,
      layer.type,
      layer.area ? layer.area.toFixed(4) : "",
      `"${coords.replace(/"/g, '""')}"`,
    ];
  });
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const outFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  downloadFile(csvContent, outFilename, "text/csv");
}
