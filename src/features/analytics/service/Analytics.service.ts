import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { apiClient2 } from "../../../api/apiClient2";

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

export interface CompanyImage {
  requestId: string;
  date: string;
  fileName: string;
  displayName: string;
  pipeline: "ship" | "aircraft" | "tree" | "raster" | string;
  imageUrl: string;
  cogUrl: string;
  csvUrl: string | null;
  geojsonUrl: string | null;
  timestamp: number;
}

export interface CompanyImagesResponse {
  success: boolean;
  images: CompanyImage[];
  message?: string;
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


// export async function getCompanyImages(): Promise<CompanyImage[]> {
//   const { data } = await apiClient2.get<CompanyImagesResponse>(
//     "/company-images/",
//   );

//   if (!data.success) {
//     throw new Error(data.message ?? "Failed to fetch company images");
//   }

//   return data.images ?? [];
// }


export type OperationKey = "aircraft_detection" | "tree_detection" | "ship_detection";

/** A detection output. Only ship_detection carries csv/geojson. */
export interface OperationResult {
  performed: boolean;
  imageUrl: string | null;
  cogUrl: string | null;
  csvUrl?: string | null;
  geojsonUrl?: string | null;
}

export interface CompanyImage {
  requestId: string;
  date: string;
  fileName: string;
  displayName: string;
  /** JPEG thumbnail of the base raster. */
  imageUrl: string;
  /** Base raster COG. */
  cogUrl: string | null;
  /** Unix seconds, fractional. */
  timestamp: number;
  /** May be absent on older records — always read through OPERATION_KEYS. */
  operations?: Partial<Record<OperationKey, OperationResult>>;
}

export interface CompanyImagesResponse {
  success: boolean;
  images: CompanyImage[];
  message?: string;
}

export const OPERATION_KEYS: OperationKey[] = [
  "aircraft_detection",
  "tree_detection",
  "ship_detection",
];

export const OPERATION_LABELS: Record<OperationKey, string> = {
  aircraft_detection: "Aircraft",
  tree_detection: "Tree",
  ship_detection: "Ship",
};

/** Operations that actually ran and produced a displayable raster. */
export function getPerformedOperations(image: CompanyImage): OperationKey[] {
  const operations = image.operations ?? {};
  return OPERATION_KEYS.filter((key) => operations[key]?.performed && operations[key]?.cogUrl);
}

export function getOperation(
  image: CompanyImage,
  key: OperationKey
): OperationResult | undefined {
  return image.operations?.[key];
}

export async function getCompanyImages(signal?: AbortSignal): Promise<CompanyImage[]> {
  const { data } = await apiClient2.get<CompanyImagesResponse>("/company-images/", { signal });

  if (!data.success) {
    throw new Error(data.message ?? "Failed to fetch company images");
  }

  // Newest first.
  return [...(data.images ?? [])].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}
