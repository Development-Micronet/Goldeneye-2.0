import { apiClient2 } from "../../../../../api/apiClient2";
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";

export interface UploadRasterResponse {
  success: boolean;
  imageUrl: string;
  previewUrl: string;
  cogUrl: string;
  cogFileUrl?: string;
  fileName?: string;
  message?: string;
}

export interface AircraftDetectionResponse {
  success: boolean;
  imageUrl: string;
  previewUrl: string;
  cogUrl: string;
  cogFileUrl: string;
  fileName: string;
  status: "ok" | "error";
  message: string;
  plane_count: number;
  note: string;
}

export interface TreeDetectionResponse {
  success: boolean;
  imageUrl: string;
  previewUrl: string;
  cogUrl: string;
  cogFileUrl: string;
  fileName: string;
  status: "ok" | "error";
  message: string;
  tree_count: number;
  aoi_applied: boolean;
  note: string;
}

export interface ShipDetectionResponse {
  success: boolean;
  imageUrl: string;
  previewUrl: string;
  cogUrl: string;
  cogFileUrl: string;
  fileName: string;
  status: "ok" | "error";
  message: string;
  ship_count: number;
  note: string;
}

/**
 * Receives a 0–1 fraction of the raster body that has reached the server.
 * This is the only genuinely measurable phase of a detection run — once the
 * upload finishes, the server works silently until it answers.
 */
export type UploadProgressHandler = (fraction: number) => void;

const withProgress = (onUploadProgress?: UploadProgressHandler): AxiosRequestConfig =>
  onUploadProgress
    ? {
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (!event.total) return;

          onUploadProgress(Math.min(1, event.loaded / event.total));
        },
      }
    : {};

const rasterForm = (file: File) => {
  const formData = new FormData();

  formData.append("image", file);

  return formData;
};

export async function uploadRaster(
  file: File,
  onUploadProgress?: UploadProgressHandler,
): Promise<UploadRasterResponse> {
  const { data } = await apiClient2.post<UploadRasterResponse>(
    "/upload-tif/",
    rasterForm(file),
    withProgress(onUploadProgress),
  );

  if (!data.success) {
    throw new Error(data.message ?? "Upload failed");
  }

  return data;
}

export async function detectAircraft(
  file: File,
  onUploadProgress?: UploadProgressHandler,
): Promise<AircraftDetectionResponse> {
  const { data } = await apiClient2.post<AircraftDetectionResponse>(
    "/aircraft/",
    rasterForm(file),
    withProgress(onUploadProgress),
  );

  if (!data.success) {
    throw new Error(data.message ?? "Aircraft detection failed");
  }

  return data;
}

export async function detectTree(
  file: File,
  onUploadProgress?: UploadProgressHandler,
): Promise<TreeDetectionResponse> {
  const { data } = await apiClient2.post<TreeDetectionResponse>(
    "/tree/",
    rasterForm(file),
    withProgress(onUploadProgress),
  );

  if (!data.success) {
    throw new Error(data.message ?? "Tree detection failed");
  }

  return data;
}

export async function detectShip(
  file: File,
  onUploadProgress?: UploadProgressHandler,
): Promise<ShipDetectionResponse> {
  const { data } = await apiClient2.post<ShipDetectionResponse>(
    "/ship/",
    rasterForm(file),
    withProgress(onUploadProgress),
  );

  if (!data.success) {
    throw new Error(data.message ?? "Ship detection failed");
  }

  return data;
}
