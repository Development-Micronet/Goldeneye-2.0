import { toast } from "react-toastify";
import type { SelectedArchiveProduct } from "../features/data/components/sidebar/store/useArchiveProductStore";
import { apiClient } from "../api/apiClient";
import { logger } from "./logger";

interface ExportKMLPayload {
  format: "kml";
  items: SelectedArchiveProduct[];
  aoi?: unknown | null;
  filename?: string;
  lang?: string;
  extraInfos?: Record<string, unknown>;
}

interface ExportHTMLPayload {
  items: SelectedArchiveProduct[];
  filename?: string;
}
interface ExportCSVPayload {
  items: SelectedArchiveProduct[];
  filename?: string;
}

interface ExportKMZPayload {
  format: "kmz";
  items: SelectedArchiveProduct[];
  aoi?: unknown | null;
  filename?: string;
  lang?: string;
  extraInfos?: Record<string, unknown>;
}

interface ExportShapePayload {
  items: SelectedArchiveProduct[];
  aoi?: unknown | null;
  filename?: string;
}

interface ExportPayloadBase {
  format: "kml" | "kmz" | "shp";
  items: Array<{
    type: string;
    id: string;
    bbox?: unknown;
    geometry: unknown;
    properties: Record<string, unknown>;
  }>;
  aois: Array<{
    label: string;
    value: string;
    coordinates: unknown;
  }>;
  filename: string;
  lang?: string;
  extraInfos?: Record<string, unknown>;
}

function normalizeAois(
  aoi: unknown,
): Array<{ label: string; value: string; coordinates: unknown }> {
  if (Array.isArray(aoi)) {
    return aoi.map((item, index) => ({
      label: typeof item?.label === "string" ? item.label : `Polygon ${index + 1}`,
      value: typeof item?.value === "string" ? item.value : `aoi_polygon_${index + 1}`,
      coordinates: item?.coordinates,
    }));
  }

  if (aoi && typeof aoi === "object") {
    const geometry = (aoi as { coordinates?: unknown }).coordinates;
    return [
      {
        label: "Polygon 1",
        value: "aoi_polygon_1",
        coordinates: geometry ?? aoi,
      },
    ];
  }

  return [];
}

function mapProductToExportItem(product: SelectedArchiveProduct) {
  return {
    type: "Feature",
    id: product.id,
    bbox: null,
    geometry: product.geometry,
    properties: {
      name: product.name,
      id: product.id,
      acquisitionDate: product.raw?.acquisitionDate,
      acquisitionIdentifier: product.raw?.acquisitionIdentifier,
      resolution: product.raw?.resolution,
      platform: product.raw?.platform,
      incidenceAngle: product.raw?.incidenceAngle,
      cloudCover: product.raw?.cloudCover,
      imageUrl: product.imageUrl,
      sensor: product.sensor,
      processingLevel: product.raw?.processingLevel,
      productType: product.raw?.productType,
    },
  };
}

export function buildExportPayload({
  format,
  items,
  aoi = null,
  filename,
  lang = "en",
  extraInfos = {},
}: {
  format: ExportPayloadBase["format"];
  items: SelectedArchiveProduct[];
  aoi?: unknown | null;
  filename: string;
  lang?: string;
  extraInfos?: Record<string, unknown>;
}) {
  return {
    format,
    items: items.map(mapProductToExportItem),
    aois: normalizeAois(aoi),
    lang,
    filename,
    extraInfos,
  } satisfies ExportPayloadBase;
}

async function postExport(payload: ExportPayloadBase) {
  const response = await apiClient.post("products/export/", payload, {
    responseType: "blob",
  });

  const contentDisposition =
    response.headers["content-disposition"] || response.headers["Content-Disposition"];
  const fileName =
    (typeof contentDisposition === "string" &&
      contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]) ||
    (typeof contentDisposition === "string" &&
      contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]) ||
    payload.filename;

  const contentTypeHeader = response.headers["content-type"];
  const contentType =
    typeof contentTypeHeader === "string" ? contentTypeHeader : "application/octet-stream";

  const blob = new Blob([response.data], {
    type: contentType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportKML({
  items,
  aoi = null,
  filename = "Archive_Product.kml",
  lang = "en",
  extraInfos = {},
}: ExportKMLPayload) {
  try {
    const payload = buildExportPayload({
      format: "kml",
      items,
      aoi,
      filename,
      lang,
      extraInfos,
    });
    await postExport(payload);
  } catch (error) {
    logger.error("KML Export Error:", error);
    toast.error("Failed to export KML.");
    throw error;
  }
}

export function exportHTML({ items, filename = "Archive_Product.html" }: ExportHTMLPayload) {
  const html = `
<!DOCTYPE html>
<html>
<head>

<title>HTML EXPORT</title>

<style>

body {
  font-family: Arial, sans-serif;
}

.header {
  padding-left:10px;
  padding-right:10px;
}

.image-id {
  color:#00468c;
}

.image-container {
  margin-bottom:20px;
  margin-top:20px;
}

.image-container img {
  max-width:300px;
  height:auto;
}

.thumbnail,
.quicklook {
  display:flex;
  align-items:center;
  gap:10px;
}

.info {
  margin:0;
  padding-left:35px;
  margin-top:20px;
}

.info p {
  margin:0;
  padding:0;
}

.product {
  margin-bottom:40px;
}

</style>

</head>


<body>

${items
      .map(
        (product) => `

<div class="product">

<div class="header">

<h2 class="image-id">
${product.id ?? product.name ?? "Unknown Product"}
</h2>

<hr/>

</div>


<div class="info">

<p>
<strong>Acquisition Date:</strong>
${product.raw?.acquisitionDate ?? "-"}
</p>


<p>
<strong>Resolution:</strong>
${product.raw?.resolution ?? "-"}m
(${product.raw?.platform ?? ""})
</p>


<p>
<strong>Incidence Angle:</strong>
${product.raw?.incidenceAngle?.toFixed(2) ?? "-"}°
</p>


<p>
<strong>Cloud Cover:</strong>
${product.raw?.cloudCover ?? "-"}%
</p>


<p>
<strong>Incidence Angle (Across Track):</strong>
${product.raw?.incidenceAngleAcrossTrack?.toFixed(2) ?? "-"}°
</p>


<p>
<strong>Incidence Angle (Along Track):</strong>
${product.raw?.incidenceAngleAlongTrack?.toFixed(2) ?? "-"}°
</p>


<p>
<strong>Sun Azimuth:</strong>
${product.raw?.illuminationAzimuthAngle?.toFixed(2) ?? "-"}°
</p>


<p>
<strong>Sun Elevation:</strong>
${product.raw?.illuminationElevationAngle?.toFixed(2) ?? "-"}°
</p>


</div>



<div class="image-container">


<div class="thumbnail">

<p>
<strong>Thumbnail:</strong>
</p>


<a href="${product.thumbnailUrl ?? product.imageUrl}" target="_blank">

<img 
src="${product.thumbnailUrl ?? product.imageUrl}"
alt="${product.id}"
style="width:112px;height:111px"
/>

</a>

</div>



<div class="quicklook">


<p>
<strong>QuickLook:</strong>
</p>


<a href="${product.imageUrl}" target="_blank">

<img
src="${product.imageUrl}"
alt="${product.id}"
style="width:112px;height:111px"
/>

</a>


</div>


</div>


</div>


`,
      )
      .join("")}


</body>

</html>
`;

  const blob = new Blob([html], {
    type: "text/html;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename.endsWith(".html") ? filename : `${filename}.html`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportCSV({ items, filename = "Archive_Product.csv" }: ExportCSVPayload) {
  //   logger.log("exportCSV", items);
  const headers = [
    "ID",
    "Acquisition Date",
    "Resolution",
    "Incidence Angle",
    "Cloud Cover",
    "Incidence Angle (Across Track)",
    "Incidence Angle (Along Track)",
    "Sun Azimuth",
    "Sun Elevation",
  ];

  const rows = items.map((product) => [
    product.id ?? "",

    product.raw?.acquisitionDate ?? "",

    `${product.raw?.resolution ?? ""}m (${product.raw?.platform ?? ""})`,

    `${Number(product.raw?.incidenceAngle ?? 0).toFixed(2)}°`,

    `${product.raw?.cloudCover ?? 0}%`,

    `${Number(product.raw?.incidenceAngleAcrossTrack ?? 0).toFixed(2)}°`,

    `${Number(product.raw?.incidenceAngleAlongTrack ?? 0).toFixed(2)}°`,

    `${Number(product.raw?.illuminationAzimuthAngle ?? 0).toFixed(2)}°`,

    `${Number(product.raw?.illuminationElevationAngle ?? 0).toFixed(2)}°`,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function exportKMZ({
  items,
  aoi = null,
  filename = "Archive_Product.kmz",
  lang = "en",
  extraInfos = {},
}: ExportKMZPayload) {
  try {
    const payload = buildExportPayload({
      format: "kmz",
      items,
      aoi,
      filename,
      lang,
      extraInfos,
    });

    await postExport(payload);
  } catch (error) {
    logger.error("KMZ Export Error:", error);
    toast.error("Failed to export KMZ.");
    throw error;
  }
}

export async function exportShape({
  items,
  aoi = null,
  filename = "Archive_Product.zip",
}: ExportShapePayload) {
  try {
    const payload = buildExportPayload({
      format: "shp",
      items,
      aoi,
      filename,
      lang: "en",
    });

    await postExport(payload);
  } catch (error) {
    logger.error("Shape Export Error:", error);
    toast.error("Failed to export Shape.");
    throw error;
  }
}
