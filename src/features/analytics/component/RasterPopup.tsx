import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Crosshair,
  Image,
  Map,
  X,
  AlertTriangle,
  Layers,
} from "lucide-react";

import AOIDialog from "./AOIDialog";
import { renderGeoTIFFPreview } from "../../../utils/Geotiffpreview";
import { useRasterStore } from "../store/useRasterStore";
import { uploadRaster, type UploadRasterResponse } from "../service/Analytics.service";
import OpacitySlider from "./OpacitySlider";
import { useMapStore } from "../store/useMapStore";
import { utmToLngLatBounds } from "../utils/projection";
import { useQueryClient } from "@tanstack/react-query";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "tif", "tiff"];
const TIFF_EXTENSIONS = ["tif", "tiff"];
const LARGE_FILE_BYTES = 50 * 1024 * 1024;

const STATUS_LABEL: Record<string, string> = {
  reading: "Reading file...",
  rendering: "Uploading to server...",
  done: "Done!",
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

interface RasterPopupProps {
  onClose: () => void;
}

const RasterPopup: React.FC<RasterPopupProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rasters = useRasterStore((s) => s.rasters);
  const addRaster = useRasterStore((s) => s.addRaster);
  const removeRaster = useRasterStore((s) => s.removeRaster);
  const toggleVisibility = useRasterStore((s) => s.toggleVisibility);
  // const updateRaster = useRasterStore((s) => s.updateRaster);
  const setFitRasterId = useRasterStore((s) => s.setFitRasterId);
  const rasterStatus = useRasterStore((s) => s.rasterStatus);
  const rasterProgress = useRasterStore((s) => s.rasterProgress);
  const setRasterStatus = useRasterStore((s) => s.setRasterStatus);
  const setRasterProgress = useRasterStore((s) => s.setRasterProgress);
  const queryClient = useQueryClient();
  const map = useMapStore((state) => state.map);
  const mapType = useMapStore((state) => state.Maptype);
  const setMaptype = useMapStore((state) => state.setMaptype);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    uploadResult: UploadRasterResponse;
  } | null>(null);

  const reset = useCallback(() => {
    setRasterStatus("idle");
    setRasterProgress(0);
  }, [setRasterStatus, setRasterProgress]);

  // Clear the "Done!" banner after a moment, and on unmount.
  useEffect(() => {
    if (rasterStatus !== "done") return;
    const timer = setTimeout(reset, 2500);
    return () => clearTimeout(timer);
  }, [rasterStatus, reset]);

  useEffect(() => reset, [reset]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mapType === "3d") {
      setMaptype("2d");
      toast.info("Switching to 2D mode to upload raster layers.");
    }

    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error("Only JPG, PNG and TIFF files are allowed");
      return;
    }
    if (file.size > LARGE_FILE_BYTES) {
      toast.warn(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — this may take a while.`,
      );
    }

    try {
      if (TIFF_EXTENSIONS.includes(extension)) {
        // Header read only — the display image is the server's previewUrl.
        // This supplies extent, CRS and resolution.
        setRasterStatus("reading");
        setRasterProgress(10);
        const meta = await renderGeoTIFFPreview(file);

        if (!meta.georeferenced) {
          toast.warn(meta.warning ?? "File is not georeferenced");
          reset();
          return;
        }

        setRasterStatus("rendering");
        const result = await uploadRaster(file, (fraction) =>
          setRasterProgress(20 + Math.round(fraction * 75)),
        );

        const id = crypto.randomUUID();
        addRaster({
          id,
          name: file.name,
          type: "tiff",
          file,
          imageUrl: result.previewUrl,
          displayImageUrl: result.previewUrl,
          displayType: "original",
          extent: meta.extent,
          aoi: meta.extent,
          projection: meta.projection,
          resolution: meta.resolution,
          width: meta.width,
          height: meta.height,
          capturedAt: meta.capturedAt,
          visible: true,
          opacity: 1,
          operations: [],
        });

        setFitRasterId(id);
        setRasterStatus("done");
        setRasterProgress(100);
        toast.success("GeoTIFF layer added");
        queryClient.invalidateQueries({
          queryKey: ["company-images"],
        });

      } else {
        // Plain image: upload, then ask the user for an AOI before adding.
        setRasterStatus("rendering");
        const result = await uploadRaster(file, (fraction) =>
          setRasterProgress(Math.round(fraction * 100)),
        );
        setPendingImage({ file, uploadResult: result });
        reset();
      }
    } catch (error) {
      console.error("Failed to process raster", error);
      toast.error(`Unable to add raster: ${errorMessage(error)}`);
      setRasterStatus("error");
      setRasterProgress(0);
    }
  };

  const saveImage = (extent: number[]) => {
    if (!pendingImage) return;
    const { file, uploadResult } = pendingImage;
    setPendingImage(null);

    const id = crypto.randomUUID();
    addRaster({
      id,
      name: file.name,
      type: "image",
      file,
      imageUrl: uploadResult.previewUrl,
      aoi: extent,
      projection: "EPSG:4326",
      visible: true,
      opacity: 1,
      operations: [],
    });

    setFitRasterId(id);
    toast.success("Image layer added");
  };

  const handleDelete = (id: string) => {
    const raster = rasters.find((r) => r.id === id);
    if (raster?.imageUrl) URL.revokeObjectURL(raster.imageUrl);
    removeRaster(id);
    toast.success("Raster layer removed");
  };

  const statusLabel = STATUS_LABEL[rasterStatus];

  const zoomToRaster = useCallback(
    (raster: (typeof rasters)[number]) => {
      if (!map) {
        console.warn("Map is not available");
        return;
      }

      if (!raster.aoi || raster.aoi.length !== 4) {
        console.warn("Raster has invalid AOI:", raster);
        return;
      }

      const bounds = utmToLngLatBounds(raster.aoi, raster.projection || "EPSG:32643");

      const [[west, south], [east, north]] = bounds as [[number, number], [number, number]];

      // console.log("Zooming to raster:", {
      //   id: raster.id,
      //   name: raster.name,
      //   projection: raster.projection,
      //   aoi: raster.aoi,
      //   bounds,
      // });

      if (
        !Number.isFinite(west) ||
        !Number.isFinite(south) ||
        !Number.isFinite(east) ||
        !Number.isFinite(north)
      ) {
        console.error("Invalid bounds:", bounds);
        return;
      }

      // Make sure bounds have a sensible size.
      if (west === east || south === north) {
        console.warn("Raster bounds have zero size:", bounds);
        return;
      }

      map.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
        maxZoom: 18,
      });
    },
    [map, rasters],
  );

  return (
    <div className="absolute top-0 left-15 z-[1000] ml-3 flex w-[360px] max-w-[90vw] flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800">Raster Layers</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {rasters.length}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">JPG • PNG • GeoTIFF</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close raster panel"
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress */}
      {statusLabel && (
        <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3 text-xs">
          <div className="flex justify-between font-medium text-teal-900">
            <span className="truncate pr-2">{statusLabel}</span>
            <span className="shrink-0">{rasterProgress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-200/60">
            <div
              className="h-full bg-teal-600 transition-all duration-300 ease-out"
              style={{ width: `${rasterProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {rasterStatus === "error" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>Error processing the raster file. Please try again.</span>
        </div>
      )}

      {/* Upload */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".jpg,.jpeg,.png,.tif,.tiff"
        onChange={handleUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="my-3 flex items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
        disabled={rasterStatus === "reading" || rasterStatus === "rendering"}
      >
        <Upload size={16} />
        Upload raster
      </button>

      {/* Layer list */}
      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {rasters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <Image size={36} className="stroke-1 text-gray-300" />
            <p className="mt-2 text-xs font-medium text-gray-500">No raster layers added</p>
          </div>
        ) : (
          rasters.map((raster) => (
            <div
              key={raster.id}
              className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-colors hover:border-gray-200 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100/60 text-teal-700">
                    {raster.type === "image" ? <Image size={18} /> : <Map size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800" title={raster.name}>
                      {raster.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="rounded bg-gray-200/70 px-1.5 py-px text-[10px] font-medium text-gray-600 uppercase">
                        {raster.type === "image" ? "Image" : "GeoTIFF"}
                      </span>
                      {raster.projection && (
                        <span className="font-mono text-[10px] text-gray-400">
                          {raster.projection}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => toggleVisibility(raster.id)}
                    title={raster.visible ? "Hide layer" : "Show layer"}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {raster.visible ? (
                      <Eye size={16} className="text-teal-600" />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => zoomToRaster(raster)}
                    title="Zoom to layer"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-teal-600"
                  >
                    <Crosshair size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(raster.id)}
                    title="Delete layer"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Opacity */}
              <OpacitySlider rasterId={raster.id} initial={raster.opacity ?? 1} />
            </div>
          ))
        )}
      </div>

      {pendingImage && (
        <AOIDialog
          file={pendingImage.file}
          onCancel={() => setPendingImage(null)}
          onSave={saveImage}
        />
      )}
    </div>
  );
};

export default RasterPopup;
