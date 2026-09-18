import { describe, it, expect } from "vitest";
import { parseGeospatialFile } from "./geospatialUtils";
import JSZip from "jszip";
import shpwrite from "@mapbox/shp-write";

describe("parseGeospatialFile", () => {
  it("parses GeoJSON string with FeatureCollection", async () => {
    const geojson = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Farm Area 1" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [77.1, 28.1],
                [77.2, 28.1],
                [77.2, 28.2],
                [77.1, 28.2],
                [77.1, 28.1],
              ],
            ],
          },
        },
      ],
    });

    const layers = await parseGeospatialFile(geojson, "test-aoi.geojson");
    expect(layers).toHaveLength(1);
    expect(layers[0].label).toBe("Farm Area 1");
    expect(layers[0].type).toBe("Polygon");
    expect(layers[0].area).toBeGreaterThan(0);
  });

  it("parses KML string with Polygon", async () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>AOI Polygon KML</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.1,28.1,0 77.2,28.1,0 77.2,28.2,0 77.1,28.2,0 77.1,28.1,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

    const layers = await parseGeospatialFile(kml, "test-aoi.kml");
    expect(layers).toHaveLength(1);
    expect(layers[0].label).toBe("AOI Polygon KML");
    expect(layers[0].type).toBe("Polygon");
  });

  it("parses KMZ archive containing doc.kml", async () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>KMZ Zone Alpha</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.1,28.1,0 77.2,28.1,0 77.2,28.2,0 77.1,28.2,0 77.1,28.1,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

    const zip = new JSZip();
    zip.file("doc.kml", kml);
    const kmzBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const layers = await parseGeospatialFile(
      kmzBuffer,
      "export-aoi-2026-09-18T09_44_26.115Z.kmz",
    );
    expect(layers).toHaveLength(1);
    expect(layers[0].label).toBe("KMZ Zone Alpha");
    expect(layers[0].type).toBe("Polygon");
    expect(layers[0].area).toBeGreaterThan(0);
  });

  it("parses Shapefile ZIP archive (.zip)", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Shapefile Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [77.1, 28.1],
                [77.2, 28.1],
                [77.2, 28.2],
                [77.1, 28.2],
                [77.1, 28.1],
              ],
            ],
          },
        },
      ],
    };

    const zipBuffer = (await (shpwrite as any).zip(geojson, {
      outputType: "arraybuffer",
    })) as ArrayBuffer;

    const layers = await parseGeospatialFile(zipBuffer, "export-shapefile.zip");
    expect(layers).toHaveLength(1);
    expect(layers[0].label).toBe("Shapefile Polygon");
    expect(layers[0].type).toBe("Polygon");
  });

  it("parses standalone .shp file", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Direct SHP" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [77.1, 28.1],
                [77.2, 28.1],
                [77.2, 28.2],
                [77.1, 28.2],
                [77.1, 28.1],
              ],
            ],
          },
        },
      ],
    };

    const zipBuffer = (await (shpwrite as any).zip(geojson, {
      outputType: "arraybuffer",
    })) as ArrayBuffer;
    const zip = await JSZip.loadAsync(zipBuffer);
    const shpFile = Object.values(zip.files).find((f) => f.name.endsWith(".shp"));
    expect(shpFile).toBeDefined();

    const shpBuffer = await shpFile!.async("arraybuffer");
    const layers = await parseGeospatialFile(shpBuffer, "sample_boundary.shp");

    expect(layers).toHaveLength(1);
    expect(layers[0].type).toBe("Polygon");
  });

  it("parses .shp with companion .dbf file", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Companion AOI" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [77.1, 28.1],
                [77.2, 28.1],
                [77.2, 28.2],
                [77.1, 28.2],
                [77.1, 28.1],
              ],
            ],
          },
        },
      ],
    };

    const zipBuffer = (await (shpwrite as any).zip(geojson, {
      outputType: "arraybuffer",
    })) as ArrayBuffer;
    const zip = await JSZip.loadAsync(zipBuffer);
    const shpBuffer = await Object.values(zip.files)
      .find((f) => f.name.endsWith(".shp"))!
      .async("arraybuffer");
    const dbfBuffer = await Object.values(zip.files)
      .find((f) => f.name.endsWith(".dbf"))!
      .async("arraybuffer");

    const layers = await parseGeospatialFile(shpBuffer, "boundary.shp", {
      shpCompanionFiles: { dbf: dbfBuffer },
    });

    expect(layers).toHaveLength(1);
    expect(layers[0].label).toBe("Companion AOI");
    expect(layers[0].type).toBe("Polygon");
  });

  it("reprojects Shapefile with Web Mercator coordinates to WGS84", async () => {
    // 77.1 deg lon in Web Mercator is ~8582730, 28.1 deg lat is ~3261947
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Web Mercator Area" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [8582730, 3261947],
                [8593862, 3261947],
                [8593862, 3274643],
                [8582730, 3274643],
                [8582730, 3261947],
              ],
            ],
          },
        },
      ],
    };

    const zipBuffer = (await (shpwrite as any).zip(geojson, {
      outputType: "arraybuffer",
    })) as ArrayBuffer;
    const zip = await JSZip.loadAsync(zipBuffer);
    const shpBuffer = await Object.values(zip.files)
      .find((f) => f.name.endsWith(".shp"))!
      .async("arraybuffer");

    const layers = await parseGeospatialFile(shpBuffer, "mercator.shp");
    expect(layers).toHaveLength(1);
    expect(layers[0].type).toBe("Polygon");
    // Coordinates must now be in degrees [~77, ~28]
    const coords = layers[0].geojson.geometry.coordinates[0][0];
    expect(coords[0]).toBeCloseTo(77.1, 1);
    expect(coords[1]).toBeCloseTo(28.1, 1);
  });

  it("throws clear error for unsupported file type", async () => {
    await expect(parseGeospatialFile("dummy", "test.pdf")).rejects.toThrow(
      /Unsupported file type: \.pdf/i,
    );
  });
});
