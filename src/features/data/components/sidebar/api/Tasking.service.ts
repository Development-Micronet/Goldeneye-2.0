import { apiClient } from "../../../../../api/apiClient";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";


/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MissionKey = "PLEIADES" | "SPOT" | "PLEIADESNEO";

/** The attempts endpoint accepts these two programming types only. */
export type ProgTypeKey = "ONEDAY" | "ONENOW";

/** "" asks Airbus to choose the mode. */
export type AcquisitionMode = "MONO" | "STEREO" | "TRI";

export interface TaskingAttemptPayload {
  acquisitionStartDate: string;
  acquisitionEndDate: string;
  missions: MissionKey[];
  progTypeNames: ProgTypeKey[];
  acquisitionMode?: AcquisitionMode;
  maxCloudCover: number;
  maxIncidenceAngle: number;
  aoi: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface TaskingSegment {
  id: string;
  footprint: {
    geometry: string; // WKT polygon
    center: string; // WKT point
  };
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
  /** Airbus error passthrough, e.g. ERR_OTHER "7.0". */
  errorCode?: string;
  message?: string;
  constraints?: string[];
}

export interface TaskingProgCapacity {
  mission: MissionKey;
  progTypes: TaskingProgType[];
}

export interface TaskingAttemptResponse {
  success: boolean;
  progCapacities: TaskingProgCapacity[];
  segments: TaskingSegment[];
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const MISSIONS: MissionKey[] = ["PLEIADES", "SPOT", "PLEIADESNEO"];

export const MISSION_LABELS: Record<MissionKey, string> = {
  PLEIADES: "Pléiades",
  SPOT: "SPOT",
  PLEIADESNEO: "Pléiades Neo",
};

export const PROG_TYPE_ORDER: ProgTypeKey[] = ["ONEDAY", "ONENOW"];

export const PROG_TYPE_META: Record<
  ProgTypeKey,
  { title: string; blurb: string; cloud: string }
> = {
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

/**
 * Airbus AOI limits per mission, shown when a mission comes back unavailable
 * and the API sends no reason of its own.
 */
export const MISSION_LIMITS: Record<
  MissionKey,
  { area?: string; height?: string; width?: string }
> = {
  PLEIADESNEO: { area: "400.0km2", height: "30.0km", width: "13.0km" },
  PLEIADES: { area: "800.5km2", height: "40.0km", width: "18.9km" },
  SPOT: { area: "7200.5km2", width: "50.0km" },
};

export const ACQUISITION_MODES: AcquisitionMode[] = [ "MONO", "STEREO", "TRI"];

export const ACQUISITION_MODE_LABELS: Record<AcquisitionMode, string> = {
  MONO: "Mono",
  STEREO: "Stereo",
  TRI: "Tri-stereo",
};

/* ------------------------------------------------------------------ */
/* Compatibility (section 2 of the API reference)                      */
/* ------------------------------------------------------------------ */

const PROG_TYPE_SUPPORT: Record<MissionKey, ProgTypeKey[]> = {
  PLEIADES: ["ONEDAY", "ONENOW"],
  SPOT: ["ONEDAY", "ONENOW"],
  // Airbus only exposes OneDay attempts for Neo.
  PLEIADESNEO: ["ONEDAY"],
};

const MODE_SUPPORT: Record<MissionKey, AcquisitionMode[]> = {
  PLEIADES: [ "MONO", "STEREO", "TRI"],
  SPOT: [ "MONO"],
  PLEIADESNEO: [ "MONO", "STEREO"],
};

export const missionSupportsProgType = (mission: MissionKey, progType: ProgTypeKey) =>
  PROG_TYPE_SUPPORT[mission].includes(progType);

export const missionSupportsMode = (mission: MissionKey, mode: AcquisitionMode) =>
  MODE_SUPPORT[mission].includes(mode);

/** Stereo and tri-stereo also depend on the contract, so flag them in the UI. */
export const modeNeedsContract = (mode: AcquisitionMode) => mode === "STEREO" || mode === "TRI";

/**
 * Order endpoints, picked by the mission and programme the chosen segment came
 * from. SPOT One Now has no published endpoint yet.
 */
export const ORDER_ENDPOINTS: Partial<Record<string, string>> = {
  PLEIADES_ONEDAY: "/tasking/pleiades-one-day/order/",
  PLEIADES_ONENOW: "/tasking/pleiades-one-now-attempts/order/",
  SPOT_ONEDAY: "/tasking/spot-one-day/order/",
  PLEIADESNEO_ONEDAY: "/tasking/pleiades-neo/order/",
};

export const orderEndpointFor = (mission: MissionKey, progType: ProgTypeKey) =>
  ORDER_ENDPOINTS[`${mission}_${progType}`];

/**
 * Airbus answers a Neo capacity miss with ERR_OTHER 7.0, which means either the
 * contract lacks the OneDay entitlement or there is no capacity in the window.
 */
export const explainUnavailable = (
  mission: MissionKey,
  progType: ProgTypeKey,
  record?: TaskingProgType
): { headline: string; lines: string[] } => {
  if (!missionSupportsProgType(mission, progType)) {
    return {
      headline: `${PROG_TYPE_META[progType].title} is not offered on this mission`,
      lines: [],
    };
  }

  if (record?.errorCode?.includes("ERR_OTHER")) {
    return {
      headline: "No capacity returned for this mission",
      lines: [
        "The contract may not carry this entitlement",
        "Or no pass is scheduled over the area in this window",
      ],
    };
  }

  const limits = MISSION_LIMITS[mission];

  return {
    headline: record?.message ?? "For the Direct to satellite tasking",
    lines:
      record?.constraints ??
      ([
        limits?.area && `AOI area must not exceed ${limits.area}`,
        limits?.height && `AOI height must not exceed ${limits.height}`,
        limits?.width && `AOI width must not exceed ${limits.width}`,
      ].filter(Boolean) as string[]),
  };
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export const validateAttemptPayload = (payload: TaskingAttemptPayload): string | null => {
  if (new Date(payload.acquisitionEndDate) < new Date(payload.acquisitionStartDate)) {
    return "The end date falls before the start date.";
  }
  if (!payload.missions.length) {
    return "No mission supports this combination of sensor and acquisition mode.";
  }
  if (!payload.progTypeNames.length) {
    return "No programming type is available for the selected mission.";
  }
  if (payload.maxCloudCover < 0 || payload.maxCloudCover > 100) {
    return "Cloud cover has to sit between 0 and 100%.";
  }
  if (payload.maxIncidenceAngle < 0 || payload.maxIncidenceAngle > 90) {
    return "Incidence angle has to sit between 0 and 90°.";
  }
  if (!payload.aoi?.coordinates?.length) {
    return "The area of interest has no coordinates.";
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

const unwrap = async <T,>(body: any, token: string): Promise<T> => {
  const envelope = typeof body === "string" ? body : body?.data;
  if (typeof envelope === "string") {
    return (await decryptAESGCM(envelope, token)) as T;
  }
  return body as T;
};

/**
 * Step 1 of the order flow. The endpoint answers with an AES-GCM envelope keyed
 * on the access token, so the token has to travel with the call.
 */
export const FetchAttempt = async (
  payload: TaskingAttemptPayload,
  token: string,
  signal?: AbortSignal
): Promise<TaskingAttemptResponse> => {
  const res = await apiClient.post("/tasking/attempts/", payload, { signal });
  return unwrap<TaskingAttemptResponse>(res.data, token);
};

/** Step 2: price the segment the user picked. */
export const FetchPrice = async (segmentKey: string, token: string, signal?: AbortSignal) => {
  const res = await apiClient.post("/tasking/price/", { segmentKey }, { signal });
  return unwrap<any>(res.data, token);
};