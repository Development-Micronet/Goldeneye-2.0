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