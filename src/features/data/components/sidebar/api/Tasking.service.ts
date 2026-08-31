import { apiClient } from "../../../../../api/apiClient";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MissionKey = "PLEIADES" | "SPOT" | "PLEIADESNEO";
export type ProgTypeKey = "ONEDAY" | "ONENOW";
export type AcquisitionMode = "MONO" | "STEREO" | "TRI";

export interface TaskingAttemptPayload {
  acquisitionStartDate: string;
  acquisitionEndDate: string;
  missions: MissionKey[];
  progTypeNames: ProgTypeKey[];
  acquisitionMode: AcquisitionMode;
  maxCloudCover: number;
  maxIncidenceAngle: number;
  aoi: { type: "Polygon"; coordinates: number[][][] };
}

export interface TaskingSegment {
  id: string;
  footprint: { geometry: string; center: string };
  instrumentMode: string;
  orderDeadline: string;
  extendedAngle: boolean;
  acquisitionStartDate: string;
  acquisitionEndDate: string;
  incidenceAngle: number;
  /** Carry this into /tasking/price/ and the order endpoint. */
  segmentKey: string;
  acrossTrackIncidenceAngle: number;
}

export interface TaskingProgType {
  name: ProgTypeKey;
  mission: MissionKey;
  segments: TaskingSegment[];
  available: boolean;
}

export interface TaskingAttemptResponse {
  success: boolean;
  progCapacities: Array<{ mission: MissionKey; progTypes: TaskingProgType[] }>;
  segments: TaskingSegment[];
}

/* ------------------------------------------------------------------ */
/* Options and labels                                                  */
/* ------------------------------------------------------------------ */

export const MISSIONS: MissionKey[] = ["PLEIADES", "SPOT", "PLEIADESNEO"];

export const PROG_TYPES: ProgTypeKey[] = ["ONEDAY", "ONENOW"];

export const PROG_TYPE_META: Record<ProgTypeKey, { title: string; blurb: string; cloud: string }> = {
  ONEDAY: {
    title: "ONE DAY",
    blurb: "Select your acquisition day",
    cloud: "No cloud coverage check",
  },
  ONENOW: {
    title: "ONE NOW",
    blurb: "Access useful information in an instant",
    cloud: "Up to 10%",
  },
};

export const MODES: AcquisitionMode[] = ["MONO", "STEREO", "TRI"];

export const MODE_LABELS: Record<AcquisitionMode, string> = {
  MONO: "Mono",
  STEREO: "Stereo",
  TRI: "Tri-stereo",
};

/** Shown when a mission has no passes, so the user knows what to change. */
export const MISSION_LIMITS: Record<MissionKey, Array<{ label: string; value: string }>> = {
  PLEIADES: [
    { label: "AOI area must not exceed", value: "800.5km2" },
    { label: "AOI height must not exceed", value: "40.0km" },
    { label: "AOI width must not exceed", value: "18.9km" },
  ],
  PLEIADESNEO: [
    { label: "AOI area must not exceed", value: "400.0km2" },
    { label: "AOI height must not exceed", value: "30.0km" },
    { label: "AOI width must not exceed", value: "13.0km" },
  ],
  SPOT: [
    { label: "AOI area must not exceed", value: "7200.5km2" },
    { label: "AOI width must not exceed", value: "50.0km" },
  ],
};

/* ------------------------------------------------------------------ */
/* Compatibility (section 2 of the API reference)                      */
/* ------------------------------------------------------------------ */

const PROG_TYPES_BY_MISSION: Record<MissionKey, ProgTypeKey[]> = {
  PLEIADES: ["ONEDAY", "ONENOW"],
  SPOT: ["ONEDAY", "ONENOW"],
  PLEIADESNEO: ["ONEDAY"], // Airbus only exposes OneDay for Neo.
};

const MODES_BY_MISSION: Record<MissionKey, AcquisitionMode[]> = {
  PLEIADES: ["MONO", "STEREO", "TRI"],
  SPOT: ["MONO"],
  PLEIADESNEO: ["MONO", "STEREO"],
};

export const supportsProgType = (mission: MissionKey, progType: ProgTypeKey) =>
  PROG_TYPES_BY_MISSION[mission].includes(progType);

export const supportsMode = (mission: MissionKey, mode: AcquisitionMode) =>
  MODES_BY_MISSION[mission].includes(mode);

/** Order endpoint for a segment. SPOT One Now has none published yet. */
export const ORDER_ENDPOINTS: Record<string, string> = {
  PLEIADES_ONEDAY: "/tasking/pleiades-one-day/order/",
  PLEIADES_ONENOW: "/tasking/pleiades-one-now-attempts/order/",
  SPOT_ONEDAY: "/tasking/spot-one-day/order/",
  PLEIADESNEO_ONEDAY: "/tasking/pleiades-neo/order/",
};

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

/** Responses come back as an AES-GCM envelope keyed on the access token. */
const unwrap = async (body: any, token: string) => {
  const envelope = typeof body === "string" ? body : body?.data;
  return typeof envelope === "string" ? await decryptAESGCM(envelope, token) : body;
};

export const FetchAttempt = async (
  payload: TaskingAttemptPayload,
  token: string
): Promise<TaskingAttemptResponse> => {
  const res = await apiClient.post("/tasking/attempts/", payload);
  return unwrap(res.data, token);
};

export const FetchPrice = async (segmentKey: string, token: string) => {
  const res = await apiClient.post("/tasking/price/", { segmentKey });
  return unwrap(res.data, token);
};

/* ------------------------------------------------------------------ */
/* Product and delivery options                                        */
/* ------------------------------------------------------------------ */

export const PRODUCT_OPTIONS = {
  geometric_processing: ["ortho", "Projected", "Primary"],
  projection_code: [
    "4326 WGS 1984-GEOGRAPHIC",
    "3857 WGS84/Web Mercator(World-between 80S. and 84N.) -PROJECTED",
    "3395 WGS84/World Mercator(World-between 80S. and 84N.) -PROJECTED",
    "3349 WGS84/PDC Mercator(Pacific Ocean 99E. to 70W.) -PROJECTED",
    "32645 WGS84/UTM 45N(N. hemisphere-84E to 90E) -PROJECTED",
    "32644 WGS84/UTM 44N(N. hemisphere-78E to 84E) -PROJECTED",
    "32643 WGS84/UTM 43N(N. hemisphere-72E to 78E) -PROJECTED",
    "32444 WGS72BE/UTM 44N(N. hemisphere-78E to 84E) -PROJECTED",
    "32244 WGS72/UTM 44N(N. hemisphere-78E to 84E) -PROJECTED",
    "24372 Kalianpur 1880/India IIa(IN.-21N to 28N and W. of 82E, PK. -S of 28N) -PROJECTED",
  ],
  spectral_bands_combination: [
    "Pansharpened 50cm 3-Band, Natural Color",
    "Panchromatic 50cm",
    "Pansharpened 50cm 4-Band",
    "Multispectral 2m 4-Band",
    "Pansharpened 50cm 3-Band,False Color",
    "Bundle:Panchromatic 50cm + Multispectral 2m 4-band",
  ],
  orthorectification_dem_reference: ["Best Available", "SRTM", "Globe"],
  product_format: [
    "DIMAP-Regular JPEG 2000",
    "DIMAP-Optimized JPEG 2000",
    "DIMAP-GeoTIFF",
    "NITF-Regular JPEG 2000",
    "NITF-GeoTIFF",
  ],
  pixel_coding: ["8 bits(JPEG 2000/GeoTIFF)", "12 bits (JPEG 2000)/16 bits (GeoTIFF)"],
  radiometric_processing: ["basic", "display", "reflectance"],
  licence: [
    "Standard Licence Agreement",
    "Standard and Background Layer Licence Agreement",
    "Background Layer Licence Agreement",
  ],
} as const;

export const PRODUCT_LABELS: Record<keyof typeof PRODUCT_OPTIONS, string> = {
  geometric_processing: "Geometric Processing",
  projection_code: "Projection Code",
  spectral_bands_combination: "Spectral Bands Combination",
  orthorectification_dem_reference: "Orthorectification DEM Reference",
  product_format: "Product Format",
  pixel_coding: "Pixel Coding",
  radiometric_processing: "Radiometric Processing",
  licence: "Licence",
};

export const APPLICATIONS = [
  "Agriculture",
  "Civil Engineering",
  "Consumer Market",
  "Defencde and Security",
  "Distribution Network",
  "Early Warning",
  "Energy",
  "Environment",
  "Forest",
  "Health",
  "Insurence",
  "Mapping",
  "Maritime",
  "Media, Press, Publishing",
  "Mobile",
  "other",
  "Telecommunications",
  "Tourism",
  "Transport",
  "Unspecified",
];

export const DELIVERY_TYPES = ["FTP + My Data", "MEDIA"];

/** Defaults that don't sit first in their list. */
export const DEFAULT_APPLICATION = "Consumer Market";
export const DEFAULT_DELIVERY_TYPE = "MEDIA";

/* ------------------------------------------------------------------ */
/* Placing the request                                                 */
/* ------------------------------------------------------------------ */

export interface TaskingRequestItem {
  indentType: "Tasking";
  aoi: { type: "Polygon"; coordinates: number[][][] };
  missions: MissionKey;
  progTypeNames: ProgTypeKey;
  segmentKey: string;
  geometric_processing: string;
  projection_code: string;
  spectral_bands_combination: string;
  orthorectification_dem_reference: string;
  product_format: string;
  pixel_coding: string;
  radiometric_processing: string;
  licence: string;
  deliveryType: string;
  customerReference: string;
  emailId: string;
  // Collected by the form but not part of the documented payload.
  application?: string;
  program?: string;
}

/** Only a superadmin orders directly; everyone else raises an indent. */
export const canPlaceOrder = (roleName?: string) => roleName === "superadmin";

export const ORDER_ENDPOINT = "/tasking/orders/";
export const INDENT_ENDPOINT = "/indent/";

export const submitTasking = async (
  items: TaskingRequestItem,
  token: string,
  asOrder: boolean
) => {
  const res = await apiClient.post(asOrder ? ORDER_ENDPOINT : INDENT_ENDPOINT, items);
  return unwrap(res.data, token);
};