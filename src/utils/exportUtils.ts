import type { DrawnLayer } from "../store/useLayersStore";

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLayersAsGeoJSON(layers: DrawnLayer[]) {
  const featureCollection = {
    type: "FeatureCollection",
    features: layers.map((layer) => {
      return {
        ...layer.geojson,
        properties: {
          ...layer.geojson.properties,
          id: layer.id,
          label: layer.label,
          type: layer.type,
          area: layer.area,
        },
      };
    }),
  };
  const jsonContent = JSON.stringify(featureCollection, null, 2);
  downloadFile(jsonContent, "selected_aoi.geojson", "application/json");
}

export function exportLayersAsKML(layers: DrawnLayer[]) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Selected AOIs</name>
`;

  layers.forEach((layer) => {
    const geom = layer.geojson.geometry;
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
    }

    kml += `    <Placemark>
      <name>${layer.label}</name>
      <description>Type: ${layer.type}${layer.area ? `, Area: ${layer.area.toFixed(2)} sqkm` : ""}</description>
${geomXml}
    </Placemark>
`;
  });

  kml += `  </Document>
</kml>`;

  downloadFile(kml, "selected_aoi.kml", "application/vnd.google-earth.kml+xml");
}

export function exportLayersAsCSV(layers: DrawnLayer[]) {
  const headers = ["ID", "Label", "Type", "Area (sqkm)", "Coordinates"];
  const rows = layers.map((layer) => {
    const coords = JSON.stringify(layer.geojson.geometry?.coordinates || []);
    return [
      layer.id,
      layer.label,
      layer.type,
      layer.area ? layer.area.toFixed(4) : "",
      `"${coords.replace(/"/g, '""')}"`,
    ];
  });
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(csvContent, "selected_aoi.csv", "text/csv");
}
