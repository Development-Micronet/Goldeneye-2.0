import * as GeoTIFF from "geotiff";
import { toast } from "react-toastify";
import * as turf from "@turf/turf";
import { useLayersStore } from "../store/useLayersStore";
import { useSelectedAOIStore } from "../features/data/hooks/useSelectedAOIStore";
import { useMapStore } from "../features/data/store/useMapStore";
import { useRasterStore as useAnalyticsRasterStore } from "../features/analytics/store/useRasterStore";
import { useMapStore as useAnalyticsMapStore } from "../features/analytics/store/useMapStore";
import { renderGeoTIFFPreview } from "./Geotiffpreview";

/**
 * Helper to get bounding box coordinates [minLon, minLat, maxLon, maxLat] from a geometry/feature.
 */
export function getBBoxFromGeoJSON(geojson: any): [number, number, number, number] | null {
  try {
    const bbox = turf.bbox(geojson);
    if (bbox && bbox.length === 4 && bbox.every((val) => !isNaN(val))) {
      return [bbox[0], bbox[1], bbox[2], bbox[3]];
    }
  } catch (err) {
    console.error("Failed to compute bbox via turf:", err);
  }
  return null;
}

/**
 * Captures MapLibre map as an HTMLCanvasElement using map.getCanvas().toDataURL()
 * Waits for map 'idle' (all layers fully rendered, draw overlay removed) before capture.
 * Returns a promise that resolves to a plain 2D canvas with the map pixels.
 */
export function captureMapLibreCanvas(map: any): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Map render capture timed out."));
    }, 8000);

    const doCapture = () => {
      clearTimeout(timeout);
      try {
        const glCanvas = map.getCanvas() as HTMLCanvasElement;
        const dataURL = glCanvas.toDataURL("image/png");

        const img = new Image();
        img.onload = () => {
          const copy = document.createElement("canvas");
          copy.width = img.naturalWidth;
          copy.height = img.naturalHeight;
          const ctx = copy.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get 2D context for canvas copy"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(copy);
        };
        img.onerror = () => reject(new Error("Failed to load map image from dataURL"));
        img.src = dataURL;
      } catch (e) {
        reject(e);
      }
    };

    // Wait for map to be fully idle (all pending source/layer changes complete and rendered)
    // This ensures the TerraDraw overlay is fully removed before we capture.
    if (map.isStyleLoaded() && !map.isMoving() && !map.isZooming() && !map.isRotating()) {
      // Map already idle — trigger one repaint to flush any pending GL state, then capture
      map.once("render", doCapture);
      map.triggerRepaint();
    } else {
      map.once("idle", doCapture);
    }
  });
}


/**
 * Captures map canvas from OpenLayers (Data page).
 * For MapLibre use captureMapLibreCanvas(map) instead.
 */
export function captureOLMapCanvas(): HTMLCanvasElement | null {
  const olViewport =
    document.querySelector(".ol-viewport") ||
    document.querySelector("#map-container") ||
    document.querySelector("#map") ||
    document.querySelector(".map-container");

  if (olViewport) {
    const canvases = Array.from(
      olViewport.querySelectorAll("canvas")
    ) as HTMLCanvasElement[];

    if (canvases && canvases.length > 0) {
      const viewportRect = olViewport.getBoundingClientRect();
      const width = Math.round(viewportRect.width || olViewport.clientWidth || 1200);
      const height = Math.round(viewportRect.height || olViewport.clientHeight || 800);

      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = width;
      compositeCanvas.height = height;
      const ctx = compositeCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        let drawnCount = 0;
        canvases.forEach((canvas) => {
          if (canvas.width > 0 && canvas.height > 0) {
            const opacity = canvas.style.opacity
              ? parseFloat(canvas.style.opacity)
              : 1;
            ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;

            const rect = canvas.getBoundingClientRect();
            const x = rect.left - viewportRect.left;
            const y = rect.top - viewportRect.top;

            ctx.drawImage(canvas, x, y, rect.width, rect.height);
            drawnCount++;
          }
        });

        ctx.globalAlpha = 1;
        if (drawnCount > 0) {
          return compositeCanvas;
        }
      }
    }
  }

  return null;
}

/**
 * Creates GeoTIFF ArrayBuffer from RGB pixel data and bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326.
 */
export function buildGeoTIFFBuffer(
  canvas: HTMLCanvasElement,
  bbox: [number, number, number, number]
): ArrayBuffer {
  const width = canvas.width;
  const height = canvas.height;

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid screenshot canvas dimensions");
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data;

  // Convert RGBA to RGB interleaved (3 samples per pixel)
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = rgba[i * 4];         // Red
    rgb[i * 3 + 1] = rgba[i * 4 + 1]; // Green
    rgb[i * 3 + 2] = rgba[i * 4 + 2]; // Blue
  }

  // Scale in degrees per pixel
  const lonSpan = Math.abs(bbox[2] - bbox[0]);
  const latSpan = Math.abs(bbox[3] - bbox[1]);
  const pixelScaleX = lonSpan / width;
  const pixelScaleY = latSpan / height;

  const metadata: GeoTIFF.GeotiffWriterMetadata = {
    width,
    height,
    SamplesPerPixel: 3,
    BitsPerSample: [8, 8, 8],
    PhotometricInterpretation: 2, // RGB
    PlanarConfiguration: 1, // Interleaved
    ModelPixelScale: [pixelScaleX, pixelScaleY, 0],
    ModelTiepoint: [0, 0, 0, bbox[0], bbox[3], 0], // Top-Left: [minLon, maxLat]
    GeographicTypeGeoKey: 4326, // WGS84
    GTModelTypeGeoKey: 2, // ModelTypeGeographic
    GTRasterTypeGeoKey: 1, // RasterPixelIsArea
  };

  return GeoTIFF.writeArrayBuffer(rgb, metadata);
}

/**
 * Downloads a GeoTIFF buffer as a .tif file
 */
export function downloadGeoTIFFFile(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: "image/tiff" });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = filename.endsWith(".tif") || filename.endsWith(".tiff") ? filename : `${filename}.tif`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

/**
 * Adds an exported GeoTIFF buffer into the Analytics Raster Store as a displayable layer
 */
export async function addGeoTIFFToAnalyticsStore(
  buffer: ArrayBuffer,
  bbox: [number, number, number, number],
  name: string
): Promise<void> {
  const filename = name.endsWith(".tif") ? name : `${name}.tif`;
  const file = new File([buffer], filename, { type: "image/tiff" });

  let previewUrl = "";
  try {
    const preview = await renderGeoTIFFPreview(file);
    previewUrl = preview.imageUrl;
  } catch (err) {
    console.warn("renderGeoTIFFPreview fallback error:", err);
    const blob = new Blob([buffer], { type: "image/tiff" });
    previewUrl = URL.createObjectURL(blob);
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  useAnalyticsRasterStore.getState().addRaster({
    id,
    name: filename,
    type: "tiff",
    file,
    imageUrl: previewUrl,
    displayImageUrl: previewUrl,
    displayType: "original",
    extent: bbox,
    aoi: bbox,
    projection: "EPSG:4326",
    visible: true,
    opacity: 1,
    operations: [],
  });

  useAnalyticsRasterStore.getState().setFitRasterId(id);
}

/**
 * Main export function for Data (/data) OpenLayers map
 */
export async function exportSelectedAOIToGeoTIFF(): Promise<boolean> {
  const { layers } = useLayersStore.getState();
  const { selectedAOIId } = useSelectedAOIStore.getState();
  const map = useMapStore.getState().mapInstance;

  let targetLayer = layers.find((l) => l.id === selectedAOIId);
  if (!targetLayer && layers.length > 0) {
    targetLayer = layers[layers.length - 1];
  }

  if (!targetLayer || !targetLayer.geojson) {
    toast.warn("Please draw or select an AOI on the map first to export GeoTIFF.");
    return false;
  }

  const toastId = toast.loading("Capturing map snapshot and generating GeoTIFF...");

  try {
    const geojson = targetLayer.geojson;
    const bbox = getBBoxFromGeoJSON(geojson);

    if (!bbox) {
      toast.update(toastId, {
        render: "Could not calculate AOI coordinates.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      return false;
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;
    const fullCanvas = captureOLMapCanvas();

    if (!fullCanvas) {
      toast.update(toastId, {
        render: "Unable to capture map screenshot. Please ensure the map is loaded.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      return false;
    }

    let aoiCanvas: HTMLCanvasElement;

    // If OpenLayers map instance is available, crop exact AOI viewport area
    if (map && typeof map.getPixelFromCoordinate === "function") {
      const topLeftPx = map.getPixelFromCoordinate([minLon, maxLat]);
      const bottomRightPx = map.getPixelFromCoordinate([maxLon, minLat]);

      if (topLeftPx && bottomRightPx) {
        const cropX = Math.max(0, Math.min(topLeftPx[0], bottomRightPx[0]));
        const cropY = Math.max(0, Math.min(topLeftPx[1], bottomRightPx[1]));
        const cropW = Math.max(10, Math.abs(bottomRightPx[0] - topLeftPx[0]));
        const cropH = Math.max(10, Math.abs(bottomRightPx[1] - topLeftPx[1]));

        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = Math.round(cropW);
        croppedCanvas.height = Math.round(cropH);
        const cropCtx = croppedCanvas.getContext("2d");

        if (cropCtx) {
          cropCtx.drawImage(
            fullCanvas,
            cropX,
            cropY,
            cropW,
            cropH,
            0,
            0,
            croppedCanvas.width,
            croppedCanvas.height
          );
          aoiCanvas = croppedCanvas;
        } else {
          aoiCanvas = fullCanvas;
        }
      } else {
        aoiCanvas = fullCanvas;
      }
    } else {
      aoiCanvas = fullCanvas;
    }

    const tiffBuffer = buildGeoTIFFBuffer(aoiCanvas, bbox);
    const cleanLabel = (targetLayer.label || "AOI").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanLabel}_${Date.now()}.tif`;

    downloadGeoTIFFFile(tiffBuffer, filename);
    await addGeoTIFFToAnalyticsStore(tiffBuffer, bbox, filename);

    toast.update(toastId, {
      render: `GeoTIFF exported successfully (${filename})`,
      type: "success",
      isLoading: false,
      autoClose: 3500,
    });

    return true;
  } catch (error: any) {
    console.error("GeoTIFF export error:", error);
    toast.update(toastId, {
      render: `Failed to export GeoTIFF: ${error?.message || "Unknown error"}`,
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
    return false;
  }
}

/**
 * Exports a drawn feature from MapLibre Analytics map as a GeoTIFF and loads it into the Raster layer list.
 * Uses map.once('render') + triggerRepaint() to capture real pixel data from the WebGL canvas.
 */
export async function exportGeoTIFFFromMapLibreFeature(
  feature: any,
  labelName = "Analytics_AOI"
): Promise<boolean> {
  const toastId = toast.loading("Capturing map and creating GeoTIFF...");
  try {
    const bbox = getBBoxFromGeoJSON(feature);
    if (!bbox) {
      toast.update(toastId, {
        render: "Invalid AOI bounds.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      return false;
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;
    const map = useAnalyticsMapStore.getState().map;

    if (!map) {
      toast.update(toastId, {
        render: "Analytics map is not loaded.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      return false;
    }

    // Capture the map frame properly using triggerRepaint + render event
    const fullCanvas = await captureMapLibreCanvas(map);

    // Project geo coordinates to pixel coordinates using the map
    const p1 = map.project([minLon, maxLat]); // top-left
    const p2 = map.project([maxLon, minLat]); // bottom-right

    let aoiCanvas: HTMLCanvasElement = fullCanvas;

    if (p1 && p2) {
      // The MapLibre project() returns CSS pixel coords.
      // The actual canvas buffer may be at devicePixelRatio scale.
      const glCanvas = map.getCanvas();
      const rect = glCanvas.getBoundingClientRect();
      const scaleX = fullCanvas.width / (rect.width || 1);
      const scaleY = fullCanvas.height / (rect.height || 1);

      const x1 = Math.min(p1.x, p2.x) * scaleX;
      const y1 = Math.min(p1.y, p2.y) * scaleY;
      const cropW = Math.abs(p2.x - p1.x) * scaleX;
      const cropH = Math.abs(p2.y - p1.y) * scaleY;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, x1);
      const clampedY = Math.max(0, y1);
      const clampedW = Math.min(cropW, fullCanvas.width - clampedX);
      const clampedH = Math.min(cropH, fullCanvas.height - clampedY);

      if (clampedW > 10 && clampedH > 10) {
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = Math.round(clampedW);
        croppedCanvas.height = Math.round(clampedH);
        const cropCtx = croppedCanvas.getContext("2d");

        if (cropCtx) {
          cropCtx.drawImage(
            fullCanvas,
            clampedX,
            clampedY,
            clampedW,
            clampedH,
            0,
            0,
            croppedCanvas.width,
            croppedCanvas.height
          );
          aoiCanvas = croppedCanvas;
        }
      }
    }

    const tiffBuffer = buildGeoTIFFBuffer(aoiCanvas, bbox);
    const cleanLabel = labelName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanLabel}_${Date.now()}.tif`;

    downloadGeoTIFFFile(tiffBuffer, filename);
    await addGeoTIFFToAnalyticsStore(tiffBuffer, bbox, filename);

    toast.update(toastId, {
      render: `GeoTIFF exported and added to Raster layers (${filename})`,
      type: "success",
      isLoading: false,
      autoClose: 3500,
    });

    return true;
  } catch (error: any) {
    console.error("MapLibre GeoTIFF export error:", error);
    toast.update(toastId, {
      render: `Export failed: ${error?.message || "Unknown error"}`,
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
    return false;
  }
}
