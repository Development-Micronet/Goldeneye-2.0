import { apiClient } from "../../../../../api/apiClient";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";

export type SatelliteProvider = "airbus" | "sentinel" | "planet" | string;

export interface ProductSearchPayload {
  provider: SatelliteProvider;
  start_date?: string;
  end_date?: string;
  cloud_cover: [number, number];
  intersects: {
    type: "Polygon";
    coordinates: number[][][];
  };
  sensors: string[];
  incidence_angle: [number, number];
  start_page: number;
  items_per_page?: number;
  limit?: number;
  sortBy:
  | "date"
  | "cloud_cover"
  | "incident_angle"
  | "+date"
  | "+cloud_cover"
  | "+incident_angle"
  | "-date"
  | "-cloud_cover"
  | "-incident_angle";
  /** Only sent when provider === "airbus" */
  productType?: string;
}

export interface EncryptedResponse {
  data: string;
}

export const searchProducts = async (payload: ProductSearchPayload): Promise<EncryptedResponse> => {
  const response = await apiClient.post<EncryptedResponse>("/products/unf-search/", payload);
  return response.data;
};

export const listofproviderandsensors = async () => {
  const res = await apiClient.get("/products/sensors/");
  return res.data;
};



/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export interface Option {
  value: string;
  label: string;
}

const asOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

/**
 * Values are what the API receives; labels are what the dropdown shows.
 * They differ where the payload wants lower case.
 */
export const ARCHIVE_OPTIONS: Record<string, Option[]> = {
  geometric_processing: [
    { value: "ortho", label: "Ortho" },
    { value: "projected", label: "Projected" },
    { value: "primary", label: "Primary" },
  ],
  projection_code: asOptions([
    "4326 WGS 1984",
    "3857 WGS84/Web Mercator (World - between 85S. and 84N.)",
    "32643 WGS84/UTM 43N (N. hemisphere - 72E to 78E)",
  ]),
  spectral_bands_combination: asOptions([
    "Panchromatic 30cm",
    "Pansharpened 30cm 4-band",
    "Multispectral 1.2m 4-band",
    "Bundle: Panchromatic 30cm + Multispectral 1.2m 4-band",
    "Full Bundle: Panchromatic 30cm + Multispectral 1.2m 6-band",
    "Pansharpened 30cm 6-band",
    "Full MS: Multispectral 1.2m 6-band",
    "Pansharpened 30cm 3-band, Natural Color",
    "Pansharpened 30cm 3-band, False Color",
  ]),
  orthorectification_dem_reference: asOptions(["Best Available", "SRTM", "Globe"]),
  product_format: asOptions([
    "DIMAP - Regular JPEG 2000",
    "DIMAP - Optimised JPEG 2000",
    "DIMAP - GeoTIFF",
    "NITF - Regular JPEG 2000",
    "NITF - GeoTIFF",
    "DIMAP - COG",
  ]),
  pixel_coding: asOptions([
    "8 bits (JPEG 2000 / GeoTIFF)",
    "12 bits (JPEG 2000) / 16 bits (GeoTIFF)",
  ]),
  radiometric_processing: [
    { value: "basic", label: "Basic" },
    { value: "reflectance", label: "Reflectance" },
    { value: "display", label: "Display" },
  ],
  licence: asOptions(["Standard", "Background Layer", "Standard + Background Layer"]),
  priority: asOptions(["Standard", "Rush (No Quality Checking)"]),
};

export const ARCHIVE_LABELS: Record<string, string> = {
  geometric_processing: "Geometric Processing",
  projection_code: "Projection Code",
  spectral_bands_combination: "Spectral Bands Combination",
  orthorectification_dem_reference: "Orthorectification dem Reference",
  product_format: "Product Format",
  pixel_coding: "Pixel Coding",
  radiometric_processing: "Radiometric Processing",
  licence: "Licence",
  priority: "Priority",
};

/** DEM reference is the one production field that may be left unset. */
export const OPTIONAL_PRODUCTION_FIELDS = ["orthorectification_dem_reference"];

export const APPLICATIONS: Option[] = [
  { value: "satellite imaging", label: "Satellite Imaging" },
  { value: "mapping", label: "Mapping" },
  { value: "agriculture", label: "Agriculture" },
  { value: "defense", label: "Defense" },
  { value: "environment monitoring", label: "Environment Monitoring" },
];

export const DELIVERY_TYPES: Option[] = [{ value: "Network", label: "Network" }];

/* ------------------------------------------------------------------ */
/* Payload                                                             */
/* ------------------------------------------------------------------ */

export interface ArchiveIndentPayload {
  indentType: "Archival";
  full_strip: boolean;
  aoi: { type: "Polygon"; coordinates: number[][][] };
  properties: {
    archive_image_id: string;
    sensor: string;
    acquisitionDate: string;
  };
  geometric_processing: string;
  projection_code: string;
  spectral_bands_combination: string;
  orthorectification_dem_reference: string;
  product_format: string;
  pixel_coding: string;
  radiometric_processing: string;
  licence: string;
  priority: string;
  deliveryType: string;
  emailId: string;
  comments: string;
  customerReference: string;
  // Shown on the confirmation step; not part of the documented payload.
  application?: string;
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** Admin and superadmin order directly. Everyone else raises an indent. */
export const canPlaceOrder = (roleName?: string) => {
  const normalized = roleName?.toLowerCase().trim();
  return normalized === "admin" || normalized === "superadmin";
};

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

export const INDENT_ENDPOINT = "/indent/";
export const ORDER_ENDPOINT = "/order/";

const unwrap = async (body: any, token: string) => {
  const envelope = typeof body === "string" ? body : body?.data;
  return typeof envelope === "string" ? await decryptAESGCM(envelope, token) : body;
};

/** Raises a request for approval. Available to every role. */
export const submitArchiveIndent = async (payload: ArchiveIndentPayload, token: string) => {
  const res = await apiClient.post(INDENT_ENDPOINT, payload);
  return unwrap(res.data, token);
};

/** Places the order outright. Superadmin only — check the role before calling. */
export const submitArchiveOrder = async (payload: ArchiveIndentPayload, token: string) => {
  const res = await apiClient.post(ORDER_ENDPOINT, payload);
  return unwrap(res.data, token);
};

/**
 * Single entry point for the form: the role decides the endpoint, so a plain
 * user can never reach the order route.
 */
// export const submitArchiveRequest = (
//   payload: ArchiveIndentPayload,
//   token: string,
//   roleName?: string
// ) =>
//   canPlaceOrder(roleName)
//     ? submitArchiveOrder(payload, token)
//     : submitArchiveIndent(payload, token);
  
export const submitArchiveRequest = (
  payload: ArchiveIndentPayload,
  token: string,
  roleName?: string
) => submitArchiveIndent(payload, token);