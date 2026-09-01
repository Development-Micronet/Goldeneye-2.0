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
/* Lead time and errors                                                */
/* ------------------------------------------------------------------ */

/**
 * Airbus rejects a window that starts less than a month out, so the earliest
 * date the UI offers is a month plus a day — the extra day keeps the request
 * clear of the server's own boundary check while it is in flight.
 */
export const earliestAcquisitionDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

/**
 * Pulls the useful line out of a DRF error body. Validation failures arrive as
 * { errors: { non_field_errors: [...] } }, not as `detail`.
 */
export const apiErrorMessage = (error: unknown): string | null => {
  const data = (error as any)?.response?.data;
  if (!data) return null;

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  const errors = data.errors ?? data;
  if (typeof errors !== "object") return null;

  for (const value of Object.values(errors)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return null;
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
/* Order form options                                                  */
/* ------------------------------------------------------------------ */

export interface Option {
  /** What the order API receives. */
  value: string;
  /** What the dropdown shows. */
  label: string;
}

export type OrderFieldKey =
  | "processing_level"
  | "projection_1"
  | "spectral_processing"
  | "dem"
  | "image_format"
  | "pixel_coding"
  | "radiometric_processing"
  | "licence";

export const ORDER_OPTIONS: Record<OrderFieldKey, Option[]> = {
  processing_level: [
    { value: "ortho", label: "Ortho" },
    { value: "projected", label: "Projected" },
    { value: "primary", label: "Primary" },
  ],
  projection_1: [
    { value: "4326", label: "4326 WGS 1984 - Geographic" },
    { value: "3857", label: "3857 WGS 84 - Web Mercator" },
    { value: "32643", label: "32643 WGS 84 / UTM 43N" },
    { value: "32644", label: "32644 WGS 84 / UTM 44N" },
    { value: "32645", label: "32645 WGS 84 / UTM 45N" },
  ],
  spectral_processing: [
    { value: "pansharpened_natural_color", label: "Pansharpened, Natural Colour" },
    { value: "pansharpened_false_color", label: "Pansharpened, False Colour" },
    { value: "panchromatic", label: "Panchromatic" },
    { value: "multispectral", label: "Multispectral" },
    { value: "bundle", label: "Bundle" },
  ],
  dem: [
    { value: "best_available", label: "Best Available" },
    { value: "srtm", label: "SRTM" },
    { value: "globe", label: "Globe" },
  ],
  image_format: [
    { value: "dimap_jpeg2000_regular", label: "DIMAP - Regular JPEG 2000" },
    { value: "dimap_jpeg2000_optimized", label: "DIMAP - Optimised JPEG 2000" },
    { value: "dimap_geotiff", label: "DIMAP - GeoTIFF" },
    { value: "nitf_jpeg2000_regular", label: "NITF - Regular JPEG 2000" },
    { value: "nitf_geotiff", label: "NITF - GeoTIFF" },
  ],
  pixel_coding: [
    { value: "8bits", label: "8 bits" },
    { value: "12bits", label: "12 bits / 16 bits" },
  ],
  radiometric_processing: [
    { value: "basic", label: "Basic" },
    { value: "reflectance", label: "Reflectance" },
    { value: "display", label: "Display" },
  ],
  licence: [
    { value: "standard", label: "Standard Licence" },
    { value: "standard_background", label: "Standard + Background Layer" },
    { value: "background", label: "Background Layer" },
  ],
};

export const ORDER_LABELS: Record<OrderFieldKey, string> = {
  processing_level: "Processing Level",
  projection_1: "Projection",
  spectral_processing: "Spectral Processing",
  dem: "DEM",
  image_format: "Image Format",
  pixel_coding: "Pixel Coding",
  radiometric_processing: "Radiometric Processing",
  licence: "Licence",
};

/** Airbus market codes. Confirm against the contract before going live. */
export const MARKETS: Option[] = [
  { value: "AGRI", label: "Agriculture" },
  { value: "CIVIL_ENGINEERING", label: "Civil Engineering" },
  { value: "CONSUMER_MARKET", label: "Consumer Market" },
  { value: "DEFENCE_SECURITY", label: "Defence and Security" },
  { value: "ENERGY", label: "Energy" },
  { value: "ENVIRONMENT", label: "Environment" },
  { value: "FOREST", label: "Forest" },
  { value: "MAPPING", label: "Mapping" },
  { value: "MARITIME", label: "Maritime" },
  { value: "MEDIA", label: "Media, Press, Publishing" },
  { value: "TELECOM", label: "Telecommunications" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UNSPECIFIED", label: "Unspecified" },
];

export const labelFor = (key: OrderFieldKey, value: string) =>
  ORDER_OPTIONS[key].find((option) => option.value === value)?.label ?? value;

/** Every production field, defaulted to its first option. */
export const defaultProduction = (): Record<OrderFieldKey, string> =>
  Object.fromEntries(
    (Object.keys(ORDER_OPTIONS) as OrderFieldKey[]).map((key) => [key, ORDER_OPTIONS[key][0].value])
  ) as Record<OrderFieldKey, string>;

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** Admin and superadmin place an order directly. Users and other roles create an indent. */
export const canPlaceOrder = (roleName?: string) => {
  const normalized = roleName?.toLowerCase().trim();
  return normalized === "admin" || normalized === "superadmin";
};

/** Direct ordering exists only where Airbus publishes an endpoint. */
export const orderEndpointFor = (mission: MissionKey, progType: ProgTypeKey) =>
  ORDER_ENDPOINTS[`${mission}_${progType}`];

/* ------------------------------------------------------------------ */
/* Payloads                                                            */
/* ------------------------------------------------------------------ */

/** What the form collects, before it is shaped for either endpoint. */
export interface TaskingOrderForm extends Record<OrderFieldKey, string> {
  acquisitionStartDate: string;
  acquisitionEndDate: string;
  maxCloudCover: number;
  maxIncidenceAngle: number;
  customerReference: string;
  comments: string;
  emailId: string;
  primaryMarket: string;
  secondaryMarket: string;
  cost: number;
}

export interface TaskingOrderContext {
  aoi: { type: "Polygon"; coordinates: number[][][] };
  mission: MissionKey;
  progType: ProgTypeKey;
  acquisitionMode: AcquisitionMode;
  segmentKey: string;
}

/** Direct order payload — mirrors the documented Pleiades/SPOT OneDay body. */
export const buildOrderPayload = (form: TaskingOrderForm, context: TaskingOrderContext) => ({
  aoi: context.aoi,
  progTypeNames: context.progType,
  acquisitionMode: context.acquisitionMode,
  acquisitionStartDate: `${form.acquisitionStartDate}T00:00:00Z`,
  acquisitionEndDate: `${form.acquisitionEndDate}T23:59:59Z`,
  segmentKey: context.segmentKey,
  maxCloudCover: String(form.maxCloudCover),
  maxIncidenceAngle: String(form.maxIncidenceAngle),
  customerReference: form.customerReference.trim(),
  comments: form.comments.trim(),
  emailId: form.emailId.trim(),
  primaryMarket: form.primaryMarket,
  secondaryMarket: form.secondaryMarket,
  spectral_processing: form.spectral_processing,
  radiometric_processing: form.radiometric_processing,
  image_format: form.image_format,
  pixel_coding: form.pixel_coding,
  processing_level: form.processing_level,
  projection_1: form.projection_1,
  licence: form.licence,
  dem: form.dem,
  cost: form.cost,
});

/** Indent payload — the same choices, spelled out for the approval queue. */
export const buildIndentPayload = (form: TaskingOrderForm, context: TaskingOrderContext) => ({
  indentType: "Tasking" as const,
  aoi: context.aoi,
  missions: context.mission,
  progTypeNames: context.progType,
  acquisitionMode: context.acquisitionMode,
  acquisitionStartDate: `${form.acquisitionStartDate}T00:00:00Z`,
  acquisitionEndDate: `${form.acquisitionEndDate}T23:59:59Z`,
  segmentKey: context.segmentKey,
  maxCloudCover: form.maxCloudCover,
  maxIncidenceAngle: form.maxIncidenceAngle,
  geometric_processing: labelFor("processing_level", form.processing_level),
  projection_code: labelFor("projection_1", form.projection_1),
  spectral_bands_combination: labelFor("spectral_processing", form.spectral_processing),
  orthorectification_dem_reference: labelFor("dem", form.dem),
  product_format: labelFor("image_format", form.image_format),
  pixel_coding: labelFor("pixel_coding", form.pixel_coding),
  radiometric_processing: labelFor("radiometric_processing", form.radiometric_processing),
  licence: labelFor("licence", form.licence),
  primaryMarket: form.primaryMarket,
  secondaryMarket: form.secondaryMarket,
  customerReference: form.customerReference.trim(),
  comments: form.comments.trim(),
  emailId: form.emailId.trim(),
});

/* ------------------------------------------------------------------ */
/* Submitting                                                          */
/* ------------------------------------------------------------------ */

export const INDENT_ENDPOINT = "/indent/";

export const submitTaskingOrder = async (
  endpoint: string,
  payload: ReturnType<typeof buildOrderPayload>,
  token: string
) => {
  const res = await apiClient.post(endpoint, payload);
  return unwrap(res.data, token);
};

export const submitTaskingIndent = async (
  payload: ReturnType<typeof buildIndentPayload>,
  token: string
) => {
  const res = await apiClient.post(INDENT_ENDPOINT, payload);
  return unwrap(res.data, token);
};