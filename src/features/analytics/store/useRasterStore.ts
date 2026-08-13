import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type RasterType = "image" | "tiff";

export type RasterStatus = "idle" | "reading" | "rendering" | "done" | "error";

export type DetectionType = "aircraft" | "tree" | "ship";

/**
 * @deprecated `RasterOperationType` is also exported by `ol/source/Raster`
 * as `"pixel" | "image"`, and the editor auto-imports the wrong one. Use
 * `DetectionType`. Delete this alias once every call site has moved over.
 */
export type RasterOperationType = DetectionType;

export type RasterDisplayType = "original" | DetectionType;

export interface RasterOperation {
  id: string;

  type: DetectionType;

  imageUrl: string;
  previewUrl: string;
  cogUrl: string;

  cogFileUrl?: string;
  fileName?: string;

  status: "ok" | "error";

  message: string;

  note?: string;

  count: number;

  aoiApplied?: boolean;

  /** wall-clock duration of the detection call, in ms */
  durationMs?: number;

  createdAt: number;
}

export interface RasterLayer {
  id: string;

  name: string;

  type: RasterType;

  /** Original uploaded file */
  file: File;

  imageUrl?: string;

  /** What the map is currently painting. Undefined = original raster. */
  displayImageUrl?: string;

  displayType?: RasterDisplayType;

  /** Id of the operation currently painted on the map, if any */
  displayOperationId?: string | null;

  /* ---- metadata read off the GeoTIFF ---------------------------- *
   * Populate these where you already parse the file (geotiff.js
   * getWidth/getHeight, ModelPixelScale, TIFFTAG_DATETIME). The panel
   * renders "—" until they are set.                                 */

  /** Ground sample distance in metres per pixel */
  resolution?: number;

  width?: number;

  height?: number;

  /** Capture timestamp, if the file carries one */
  capturedAt?: number;

  /** Original GeoTIFF extent */
  aoi?: number[];

  /** GeoTIFF CRS */
  projection?: string;

  /** Transformed map extent */
  extent?: number[];

  visible: boolean;

  opacity?: number;

  operations: RasterOperation[];
}

/**
 * Bumping `nonce` is what makes the map re-run its fit, even when the
 * same raster is zoomed twice in a row.
 */
export interface ZoomRequest {
  rasterId: string;
  nonce: number;
}

interface RasterStore {
  rasters: RasterLayer[];

  /** The layer the analytics panel and map are pointed at */
  fitRasterId: string | null;

  rasterStatus: RasterStatus;

  rasterProgress: number;

  zoomRequest: ZoomRequest | null;

  addRaster: (layer: RasterLayer) => void;

  removeRaster: (id: string) => void;

  clearRasters: () => void;

  toggleVisibility: (id: string) => void;

  updateRaster: (id: string, data: Partial<RasterLayer>) => void;

  /** Paint a detection result on the map */
  showOperation: (rasterId: string, operationId: string) => void;

  /** Go back to the raster the user uploaded */
  resetDisplayImage: (rasterId: string) => void;

  addOperation: (rasterId: string, operation: RasterOperation) => void;

  /** Batch insert — used when several detections resolve together */
  addOperations: (rasterId: string, operations: RasterOperation[]) => void;

  renameOperation: (rasterId: string, operationId: string, fileName: string) => void;

  removeOperation: (rasterId: string, operationId: string) => void;

  requestZoom: (rasterId: string) => void;

  clearZoomRequest: () => void;

  setFitRasterId: (id: string | null) => void;

  setRasterStatus: (status: RasterStatus) => void;

  setRasterProgress: (value: number) => void;

  setRasterDisplay: (id: string, displayImageUrl: string, displayType: RasterDisplayType) => void;
}

/**
 * Blob URLs created with URL.createObjectURL pin their Blob in memory
 * until revoked — for GeoTIFF-sized payloads that is tens of MB per
 * dropped layer. Remote (http) URLs are left alone.
 *
 * If any of these URLs are also handed to another surface that outlives
 * the store entry, revoke there instead of here.
 */
const revoke = (...urls: (string | null | undefined)[]) => {
  for (const url of urls) {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }
};

const revokeOperation = (operation: RasterOperation) =>
  revoke(operation.imageUrl, operation.previewUrl, operation.cogUrl, operation.cogFileUrl);

const revokeLayer = (layer: RasterLayer) => {
  revoke(layer.imageUrl, layer.displayImageUrl);
  layer.operations.forEach(revokeOperation);
};

/**
 * Small helper so every raster mutation stays a one-liner below.
 * Returns the original array when nothing matched, so a stale id does
 * not spawn a new array and re-render every subscriber.
 */
const patchRaster = (
  rasters: RasterLayer[],
  id: string,
  patch: (raster: RasterLayer) => RasterLayer,
) => {
  let changed = false;

  const next = rasters.map((raster) => {
    if (raster.id !== id) return raster;

    const patched = patch(raster);

    if (patched !== raster) changed = true;

    return patched;
  });

  return changed ? next : rasters;
};

export const useRasterStore = create<RasterStore>()(
  devtools(
    (set) => ({
      rasters: [],

      fitRasterId: null,

      rasterStatus: "idle",

      rasterProgress: 0,

      zoomRequest: null,

      addRaster: (layer) =>
        set((state) => ({
          rasters: [
            ...state.rasters,
            {
              ...layer,
              operations: layer.operations ?? [],
              displayType: layer.displayType ?? "original",
              displayOperationId: null,
              // A layer that arrives without these renders invisible or
              // fully transparent, which reads as "the upload failed".
              visible: layer.visible ?? true,
              opacity: layer.opacity ?? 1,
              displayImageUrl: layer.displayImageUrl ?? layer.imageUrl,
            },
          ],
          // a freshly added raster becomes the selected one
          fitRasterId: layer.id,
        })),

      removeRaster: (id) =>
        set((state) => {
          const doomed = state.rasters.find((raster) => raster.id === id);

          if (!doomed) return state;

          revokeLayer(doomed);

          const rasters = state.rasters.filter((raster) => raster.id !== id);

          return {
            rasters,
            fitRasterId:
              state.fitRasterId === id
                ? (rasters[rasters.length - 1]?.id ?? null)
                : state.fitRasterId,
            // a pending fit aimed at a layer that no longer exists would
            // otherwise sit in the store forever
            zoomRequest: state.zoomRequest?.rasterId === id ? null : state.zoomRequest,
          };
        }),

      clearRasters: () =>
        set((state) => {
          state.rasters.forEach(revokeLayer);

          return {
            rasters: [],
            fitRasterId: null,
            rasterStatus: "idle",
            rasterProgress: 0,
            zoomRequest: null,
          };
        }),

      toggleVisibility: (id) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, id, (raster) => ({
            ...raster,
            visible: !raster.visible,
          })),
        })),

      updateRaster: (id, data) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, id, (raster) => ({
            ...raster,
            ...data,
          })),
        })),

      addOperation: (rasterId, operation) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => ({
            ...raster,
            operations: [...raster.operations, operation],
          })),
        })),

      addOperations: (rasterId, operations) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => ({
            ...raster,
            operations: [...raster.operations, ...operations],
          })),
        })),

      showOperation: (rasterId, operationId) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => {
            const operation = raster.operations.find((item) => item.id === operationId);

            if (!operation) return raster;

            return {
              ...raster,
              displayImageUrl: operation.imageUrl,
              displayType: operation.type,
              displayOperationId: operation.id,
            };
          }),
        })),

      resetDisplayImage: (rasterId) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => ({
            ...raster,
            displayImageUrl: raster.imageUrl,
            displayType: "original",
            displayOperationId: null,
          })),
        })),

      renameOperation: (rasterId, operationId, fileName) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => ({
            ...raster,
            operations: raster.operations.map((operation) =>
              operation.id === operationId ? { ...operation, fileName } : operation,
            ),
          })),
        })),

      removeOperation: (rasterId, operationId) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, rasterId, (raster) => {
            const doomed = raster.operations.find((operation) => operation.id === operationId);

            if (!doomed) return raster;

            const wasOnMap = raster.displayOperationId === operationId;

            revokeOperation(doomed);

            return {
              ...raster,
              operations: raster.operations.filter((operation) => operation.id !== operationId),
              // deleting the layer that's painted would leave a dead URL on the map
              displayImageUrl: wasOnMap ? raster.imageUrl : raster.displayImageUrl,
              displayType: wasOnMap ? "original" : raster.displayType,
              displayOperationId: wasOnMap ? null : raster.displayOperationId,
            };
          }),
        })),

      requestZoom: (rasterId) =>
        set((state) => ({
          zoomRequest: {
            rasterId,
            nonce: (state.zoomRequest?.nonce ?? 0) + 1,
          },
        })),

      clearZoomRequest: () => set({ zoomRequest: null }),

      setFitRasterId: (id) => set({ fitRasterId: id }),

      setRasterStatus: (status) => set({ rasterStatus: status }),

      setRasterProgress: (value) => set({ rasterProgress: value }),

      setRasterDisplay: (id, displayImageUrl, displayType) =>
        set((state) => ({
          rasters: patchRaster(state.rasters, id, (raster) => ({
            ...raster,
            displayImageUrl,
            displayType,
          })),
        })),
    }),
    {
      name: "raster-store",
      stateSanitizer: (state: RasterStore) => ({
        ...state,
        rasters: state.rasters.map((r) => ({
          ...r,
          file: r.file ? `File[${r.file.name}]` : undefined,
        })),
      }),
    },
  ),
);