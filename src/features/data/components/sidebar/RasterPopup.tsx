import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Upload, Eye, EyeOff, Trash2, Crosshair, Image, Map, X, AlertTriangle, Layers, Loader2 } from "lucide-react";

import { useRasterStore } from "../../hooks/useRasterStore";
import AOIDialog from "./component/AOIDialog";
import { uploadRaster, type UploadRasterResponse } from "./api/Analytics.service";
import { readGeoTIFFMetadata, renderGeoTIFFPreview } from "../../../../utils/Geotiffpreview";

interface RasterPopupProps {
  onClose: () => void;
}
const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024; // 50MB



type ServerPhase = "idle" | "converting" | "error";

const RasterPopup: React.FC<RasterPopupProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag-to-move state
  const isDraggingPanel = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);

  const handlePanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from the header area (the event target must be the header or its children)
    isDraggingPanel.current = true;
    const rect = panelRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onMouseUp = () => { isDraggingPanel.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  const rasters = useRasterStore((state) => state.rasters);
  const addRaster = useRasterStore((state) => state.addRaster);
  const removeRaster = useRasterStore((state) => state.removeRaster);
  const toggleVisibility = useRasterStore((state) => state.toggleVisibility);
  const updateRaster = useRasterStore((state) => state.updateRaster);
  const setFitRasterId = useRasterStore((state) => state.setFitRasterId);

  const setRasterStatus = useRasterStore((state) => state.setRasterStatus);
  const setRasterProgress = useRasterStore((state) => state.setRasterProgress);
  const rasterStatus = useRasterStore((state) => state.rasterStatus);
  const rasterProgress = useRasterStore((state) => state.rasterProgress);

  const [pendingImageData, setPendingImageData] = useState<{ file: File; uploadResult: UploadRasterResponse } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingName, setProcessingName] = useState<string | null>(null);
  const [serverPhase, setServerPhase] = useState<ServerPhase>("idle");

  useEffect(() => {
    if (rasterStatus === "done") {
      const timer = setTimeout(() => {
        setRasterStatus("idle");
        setRasterProgress(0);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [rasterStatus, setRasterStatus, setRasterProgress]);

  useEffect(() => {
    return () => {
      setRasterStatus("idle");
      setRasterProgress(0);
    };
  }, [setRasterStatus, setRasterProgress]);

  const handleChooseFile = () => fileInputRef.current?.click();

  const ALLOWED = ["jpg", "jpeg", "png", "tif", "tiff"];
  const TIFF = ["tif", "tiff"];

  const processFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (!ALLOWED.includes(extension)) {
        toast.error("Only JPG, PNG and TIFF files are allowed");
        return;
      }

      if (file.size > LARGE_FILE_WARNING_BYTES) {
        toast.warn(
          `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)}MB — this may take a while to upload.`
        );
      }

      /* ---------------- plain images ---------------- */

      if (!TIFF.includes(extension)) {
        setServerPhase("converting");
        setProcessingName(file.name);

        try {
          const result = await uploadRaster(file);

          setPendingImageData({ file, uploadResult: result });
          setServerPhase("idle");
        } catch (error) {
          console.error("Failed to process image", error);

          toast.error(
            `Unable to upload image: ${error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // must not be reset in finally, or the error phase is erased
          setServerPhase("error");
        } finally {
          setProcessingName(null);
        }

        return;
      }

      /* ---------------- GeoTIFF ---------------- */

      const id = crypto.randomUUID();

      setProcessingName(file.name);

      try {
        // Header read only — no pixel decode, since the display image is the
        // server's previewUrl. This is what supplies extent and CRS.
        setRasterStatus("reading");
        setRasterProgress(15);

        const meta = await renderGeoTIFFPreview(file);

        if (!meta.georeferenced && meta.warning) {
          toast.warn(meta.warning);
          setRasterStatus("idle");
          setRasterProgress(0);
          return;
        }
        console.warn(meta.warning)

        setRasterProgress(35);
        setServerPhase("converting");

        const result = await uploadRaster(file, (fraction) =>
          setRasterProgress(35 + Math.round(fraction * 55))
        );

        setServerPhase("idle");
        setRasterStatus("rendering");
        setRasterProgress(95);

        addRaster({
          id,
          name: file.name,
          type: "tiff",
          file,

          imageUrl: result.previewUrl,
          displayImageUrl: result.previewUrl,
          displayType: "original",

          // from the file itself — previously undefined outer-scope variables
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

        setRasterStatus("done");
        setRasterProgress(100);
        setFitRasterId(id);

        toast.success("GeoTIFF layer added");
      } catch (error) {
        console.error("Failed to process GeoTIFF", error);

        toast.error(
          `Unable to add GeoTIFF: ${error instanceof Error ? error.message : "Unknown error"
          }`
        );

        setRasterStatus("error");
        setServerPhase("error");
        setRasterProgress(0);
      } finally {
        setProcessingName(null);
      }
    },
    [
      addRaster,
      setFitRasterId,
      setPendingImageData,
      setProcessingName,
      setRasterProgress,
      setRasterStatus,
      setServerPhase,
    ]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      await processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const saveImage = (extent: number[]) => {
    if (!pendingImageData) return;

    const { file, uploadResult } = pendingImageData;
    setPendingImageData(null); // close AOIDialog

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

  const handleZoom = (id: string) => setFitRasterId(id);

  const showGlobalProgress = rasterStatus !== "idle" && rasterStatus !== "error";

  const globalProgressLabel = useMemo(() => {
    if (rasterStatus === "reading")
      return processingName ? `Reading ${processingName}...` : "Reading GeoTIFF...";
    if (rasterStatus === "rendering") return "Rendering raster on map...";
    if (rasterStatus === "done") return "Done!";
    return null;
  }, [rasterStatus, processingName]);

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto z-[2000] flex flex-col rounded-xl border border-gray-200/80 bg-white/95 p-4 text-left shadow-2xl backdrop-blur-md select-none"
      style={{
        position: 'fixed',
        left: panelPos?.x ?? 80,
        top: panelPos?.y ?? '6rem',
        right: 'auto',
        width: 380,
        minWidth: 300,
        maxWidth: '90vw',
        minHeight: 200,
        resize: 'both',
        overflow: 'hidden',
      }}
    >
      {/* Header - grab this to drag the panel */}
      <div
        className="flex cursor-grab active:cursor-grabbing items-center justify-between border-b border-gray-100 pb-3"
        onMouseDown={handlePanelMouseDown}
      >
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
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close raster panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Status & Progress feedback */}
      {showGlobalProgress && globalProgressLabel && (
        <div className="mt-3 rounded-lg bg-teal-50/80 p-3 text-xs border border-teal-100">
          <div className="flex justify-between font-medium text-teal-900">
            <span className="truncate pr-2">{globalProgressLabel}</span>
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

      {serverPhase === "converting" && (
        <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-amber-50/90 p-3 text-xs text-amber-900 border border-amber-200/60">
          <Loader2 size={16} className="shrink-0 animate-spin text-amber-600" />
          <span className="truncate">
            Converting {processingName ?? "file"} to COG on server...
          </span>
        </div>
      )}

      {(rasterStatus === "error" || serverPhase === "error") && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span>Error processing the raster file. Please try again.</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="my-3">
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.tif,.tiff"
          onChange={handleUpload}
        />
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleChooseFile}
          className={`group cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${isDragging
            ? "border-teal-500 bg-teal-50/50 scale-[1.01]"
            : "border-gray-200 hover:border-teal-400 hover:bg-gray-50/50"
            }`}
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 transition-transform group-hover:scale-110">
            <Upload size={20} />
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-700">
            {isDragging ? "Drop file to upload" : "Click to upload raster"}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">or drag and drop GeoTIFF / Image file here</p>
        </div>
      </div>

      {/* Raster Layers List */}
      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {rasters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center text-gray-400">
            <Image size={36} className="stroke-1 opacity-50" />
            <p className="mt-2 text-xs font-medium text-gray-500">No raster layers added</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Upload a GeoTIFF or Image to get started</p>
          </div>
        ) : (
          rasters.map((raster) => (
            <div
              key={raster.id}
              className="group rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm"
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="rounded bg-gray-200/70 px-1.5 py-0.2 text-[10px] font-medium text-gray-600 uppercase">
                        {raster.type === "image" ? "Image" : "GeoTIFF"}
                      </span>
                      {raster.projection && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {raster.projection}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => toggleVisibility(raster.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    aria-label={raster.visible ? "Hide layer" : "Show layer"}
                    title={raster.visible ? "Hide layer" : "Show layer"}
                  >
                    {raster.visible ? <Eye size={16} className="text-teal-600" /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleZoom(raster.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-teal-600"
                    aria-label="Zoom to layer"
                    title="Zoom to layer"
                  >
                    <Crosshair size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(raster.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete layer"
                    title="Delete layer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="mt-2.5 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                  <span>Opacity</span>
                  <span className="font-mono text-gray-700">{Math.round((raster.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={raster.opacity ?? 1}
                  onChange={(event) =>
                    updateRaster(raster.id, { opacity: Number(event.target.value) })
                  }
                  className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-teal-600 transition-all"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {pendingImageData && (
        <AOIDialog file={pendingImageData.file} onCancel={() => setPendingImageData(null)} onSave={saveImage} />
      )}
    </div>
  );
};

export default RasterPopup;
