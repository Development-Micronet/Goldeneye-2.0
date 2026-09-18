import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import {
  exportLayersAsKMZ,
  exportLayersAsShapefile,
  generateKMLString,
  getLayersFeatureCollection,
} from "./exportUtils";
import type { DrawnLayer } from "../store/useLayersStore";

const createdBlobs: { blob: Blob; filename: string }[] = [];

beforeEach(() => {
  createdBlobs.length = 0;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    // clicked
  });
  globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
    createdBlobs.push({ blob, filename: "" });
    return "blob:mock-url";
  });
  globalThis.URL.revokeObjectURL = vi.fn();
});

const mockLayer: DrawnLayer = {
  id: "test-layer-1",
  label: "AOI Alpha",
  type: "Polygon",
  area: 5.4321,
  visible: true,
  geojson: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [77.1, 28.5],
          [77.2, 28.5],
          [77.2, 28.6],
          [77.1, 28.6],
          [77.1, 28.5],
        ],
      ],
    },
    properties: {
      label: "AOI Alpha",
    },
  },
};

describe("exportUtils", () => {
  it("generates valid GeoJSON feature collection", () => {
    const fc = getLayersFeatureCollection([mockLayer]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.type).toBe("Polygon");
    expect(fc.features[0].properties.label).toBe("AOI Alpha");
  });

  it("generates valid KML string", () => {
    const kml = generateKMLString([mockLayer]);
    expect(kml).toContain("<kml");
    expect(kml).toContain("<Document>");
    expect(kml).toContain("<Placemark>");
    expect(kml).toContain("<name>AOI Alpha</name>");
    expect(kml).toContain("<Polygon>");
  });

  it("exports KMZ as a zip file containing doc.kml", async () => {
    await exportLayersAsKMZ([mockLayer], "test.kmz");

    expect(createdBlobs.length).toBeGreaterThan(0);
    const lastBlob = createdBlobs[createdBlobs.length - 1].blob;
    expect(lastBlob).toBeDefined();

    // Verify KMZ contents with JSZip
    const zip = await JSZip.loadAsync(lastBlob);
    expect(zip.file("doc.kml")).not.toBeNull();
    const docKml = await zip.file("doc.kml")!.async("string");
    expect(docKml).toContain("AOI Alpha");
  });

  it("exports Shapefile as a zip containing .shp, .shx, .dbf, .prj, .cpg", async () => {
    await exportLayersAsShapefile([mockLayer], "test.zip");

    expect(createdBlobs.length).toBeGreaterThan(0);
    const lastBlob = createdBlobs[createdBlobs.length - 1].blob;
    expect(lastBlob).toBeDefined();

    const zip = await JSZip.loadAsync(lastBlob);
    const fileNames = Object.keys(zip.files);

    expect(fileNames.some((f) => f.endsWith(".shp"))).toBe(true);
    expect(fileNames.some((f) => f.endsWith(".shx"))).toBe(true);
    expect(fileNames.some((f) => f.endsWith(".dbf"))).toBe(true);
    expect(fileNames.some((f) => f.endsWith(".prj"))).toBe(true);
    expect(fileNames.some((f) => f.endsWith(".cpg"))).toBe(true);
  });
});
