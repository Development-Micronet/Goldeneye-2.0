import { describe, expect, it } from "vitest";
import type { SelectedArchiveProduct } from "../features/data/components/sidebar/store/useArchiveProductStore";
import { buildExportPayload } from "./Exportfunction";

describe("buildExportPayload", () => {
  it("maps selected products and AOI into the backend export payload", () => {
    const products = [
      {
        id: "product-1",
        name: "Product 1",
        imageUrl: "https://example.com/quicklook.jpg",
        coordinates: null,
        geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
        date: "2024-01-01",
        sensor: "PNEO",
        raw: {
          acquisitionDate: "2024-01-01",
          acquisitionIdentifier: "abc-123",
          resolution: 0.3,
          platform: "PLEIADES",
          incidenceAngle: 9.5,
          cloudCover: 2,
          processingLevel: "ALBUM",
          productType: "mono",
        },
      },
    ] as SelectedArchiveProduct[];

    const payload = buildExportPayload({
      format: "kmz",
      items: products,
      aoi: {
        type: "Polygon",
        coordinates: [[[77.7, 20.6]]],
      },
      filename: "sample.kmz",
      lang: "en",
      extraInfos: { exportedBy: "Test" },
    });

    expect(payload.format).toBe("kmz");
    expect(payload.filename).toBe("sample.kmz");
    expect(payload.aois).toEqual([
      {
        label: "Polygon 1",
        value: "aoi_polygon_1",
        coordinates: [[[77.7, 20.6]]],
      },
    ]);
    expect(payload.items[0]).toMatchObject({
      type: "Feature",
      id: "product-1",
      geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
      properties: expect.objectContaining({
        id: "product-1",
        name: "Product 1",
        acquisitionDate: "2024-01-01",
      }),
    });
  });
});
