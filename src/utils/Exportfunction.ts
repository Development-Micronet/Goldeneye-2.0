import { toast } from "react-toastify";
import type { SelectedArchiveProduct } from "../features/data/components/sidebar/store/useArchiveProductStore";


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
  items: unknown[];
  aoi?: unknown[] | null;
  filename?: string;
  lang?: string;
  extraInfos?: Record<string, unknown>;
}

interface ExportShapePayload {
  items: SelectedArchiveProduct[];
  aoi?: unknown | null;
  filename?: string;
}
export async function exportKML({
  items,
  aoi = [],
  filename = "Archive_Product.kml",
  lang = "en",
  extraInfos = {},
}: ExportKMLPayload) {
  //   console.log(aoi);
  const payload = {
    format: "kml",

    items: items.map((product) => ({
      type: "Feature",

      geometry: product.geometry,

      properties: {
        acquisitionDate: product.raw?.acquisitionDate,

        acquisitionIdentifier: product.raw?.acquisitionIdentifier,

        resolution: product.raw?.resolution,

        incidenceAngle: product.raw?.incidenceAngle,

        cloudCover: product.raw?.cloudCover,

        imageUrl: product.imageUrl,
      },

      id: product.id,
    })),

    aois: Array.isArray(aoi)
      ? aoi.map((item) => ({
          label: item.label,
          value: item.value,
          coordinates: item.coordinates,
        }))
      : [
          {
            label: "Polygon 1",
            value: "aoi_polygon_1",
            coordinates: aoi,
          },
        ],

    lang,

    filename,

    extraInfos,
  };

  try {
    toast.info("KML export backend is not ready yet.");
  } catch (error) {
    console.error("KML Export Error:", error);
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
  //   console.log("exportCSV", items);
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
}: ExportKMZPayload) {
  const features = [
    ...items.map((product) => ({
      type: "Feature",
      geometry: product.geometry,
      properties: {
        name: product.name,
        id: product.id,

        acquisitionDate: product.raw?.acquisitionDate,
        acquisitionIdentifier: product.raw?.acquisitionIdentifier,

        resolution: product.raw?.resolution,
        platform: product.raw?.platform,

        incidenceAngle: product.raw?.incidenceAngle,
        incidenceAngleAcrossTrack: product.raw?.incidenceAngleAcrossTrack,
        incidenceAngleAlongTrack: product.raw?.incidenceAngleAlongTrack,

        illuminationAzimuthAngle: product.raw?.illuminationAzimuthAngle,

        illuminationElevationAngle: product.raw?.illuminationElevationAngle,

        cloudCover: product.raw?.cloudCover,

        imageUrl: product.imageUrl,

        sensor: product.sensor,

        processingLevel: product.raw?.processingLevel,

        productType: product.raw?.productType,
      },
    })),

    ...(aoi
      ? [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: Array.isArray(aoi) ? aoi : aoi.coordinates,
            },
            properties: {
              name: "AOI",
            },
          },
        ]
      : []),
  ];

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  try {
    console.log("KMZ Payload Ready:", geojson);

    toast.info("KMZ export backend not done yet");

    return;
  } catch (error) {
    console.error("KMZ Export Error:", error);
    toast.error("KMZ export failed");
  }
}

export async function exportShape({
  items,
  aoi = null,
  filename = "Archive_Product.zip",
}: ExportShapePayload) {
  const features = [
    ...items.map((product) => ({
      type: "Feature",
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
    })),

    ...(aoi
      ? [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: Array.isArray(aoi) ? aoi : aoi.coordinates,
            },
            properties: {
              name: "AOI",
            },
          },
        ]
      : []),
  ];

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  try {
    console.log("Shape Export Payload Ready:", geojson);

    toast.info("Shape export backend not done yet");

    return;

    // Future:
    // POST geojson to backend
    // Backend will create .shp/.zip file
  } catch (error) {
    console.error("Shape Export Error:", error);
    toast.error("Shape export failed");
  }
}
