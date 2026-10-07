import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import {
  FetchAttempt,
  FetchFeasibility,
  MISSIONS,
  MISSION_LIMITS,
  MODES,
  MODE_LABELS,
  PROG_TYPES,
  PROG_TYPE_META,
  apiErrorMessage,
  earliestAcquisitionDate,
  supportsMode,
  supportsProgType,
} from "../api/Tasking.service";
import type {
  AcquisitionMode,
  MissionKey,
  ProgTypeKey,
  TaskingAttemptResponse,
  TaskingFeasibility,
  TaskingProgType,
  TaskingSegment,
} from "../api/Tasking.service";
import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../../../store/useLayersStore";
import { useAuthStore } from "../../../../../store/useAuthStore";
import { TaskingOrderForm } from "../component/Tasking/Taskingorderform";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const SENSORS: Array<{ label: string; missions: MissionKey[] }> = [
  { label: "All sensors", missions: MISSIONS },
  { label: "Pléiades", missions: ["PLEIADES"] },
  { label: "SPOT", missions: ["SPOT"] },
  { label: "Pléiades Neo", missions: ["PLEIADESNEO"] },
];

const INCIDENCE_OPTIONS = [20, 30, 50];
const CLOUD_OPTIONS = [5, 10, 20];
const AOI_TYPES = ["Polygon", "Box", "Point", "Polyline", "Coordinates", "Bound Coordinates"];
const DEBOUNCE_MS = 500;

/** Days shown side by side once the section is opened out. */
const DAYS_PER_PAGE = 2;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Shift a yyyy-mm-dd string by a number of days. */
const addDays = (isoDay: string, days: number) => {
  if (!isoDay) return "";
  const [year, month, day] = isoDay.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const formatDay = (iso: string) => dayFormat.format(new Date(iso));
const formatTime = (iso: string) => timeFormat.format(new Date(iso));

/** Layers hold either a Feature or a bare geometry. */
const polygonRings = (geojson: any): number[][][] | null => {
  const geometry = geojson?.geometry ?? geojson;
  if (geometry?.type === "Polygon") return geometry.coordinates;
  if (geometry?.type === "MultiPolygon") return geometry.coordinates?.[0] ?? null;
  if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [cx, cy] = geometry.coordinates;
    const delta = 0.01;
    return [
      [
        [cx - delta, cy - delta],
        [cx + delta, cy - delta],
        [cx + delta, cy + delta],
        [cx - delta, cy + delta],
        [cx - delta, cy - delta],
      ],
    ];
  }
  return null;
};

const field =
  "border-border text-text-muted focus:border-primary w-full min-w-0 rounded-md border bg-white px-2 py-1.5 text-xs outline-none";

const labelStyle = "text-primary mb-1 block text-xs font-semibold";

/* ------------------------------------------------------------------ */
/* Pass card                                                           */
/* ------------------------------------------------------------------ */

interface PassCardProps {
  mission: MissionKey;
  segment: TaskingSegment;
  maxIncidence: number;
  onSelect: () => void;
}

const PassCard: React.FC<PassCardProps> = ({ mission, segment, maxIncidence, onSelect }) => (
  <div className="space-y-1">
    <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>

    <p className="text-[11.5px] text-slate-700">
      {formatDay(segment.acquisitionStartDate)} {formatTime(segment.acquisitionStartDate)}
    </p>
    <p className="text-[11.5px] text-slate-700">
      Incidence angle:{" "}
      <span className="font-bold text-slate-900">{segment.incidenceAngle.toFixed(2)}°</span> -{" "}
      {maxIncidence}°
    </p>
    <p className="text-[11.5px] text-slate-700">
      Order deadline: {formatDay(segment.orderDeadline)} {formatTime(segment.orderDeadline)} (UTC)
    </p>

    <button
      type="button"
      onClick={onSelect}
      className="bg-primary hover:bg-primary/90 mt-2 rounded-md px-5 py-2 text-xs font-semibold tracking-wide text-white"
    >
      SELECT
    </button>
  </div>
);

/* ------------------------------------------------------------------ */
/* Mission summary                                                     */
/* ------------------------------------------------------------------ */

interface MissionCardProps {
  mission: MissionKey;
  segments: TaskingSegment[];
  reason: string | null;
  maxIncidence: number;
  onSelect: (segment: TaskingSegment) => void;
}

const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  segments,
  reason,
  maxIncidence,
  onSelect,
}) => (
  <div className="space-y-2 p-4">
    {segments.length > 0 && (
      <PassCard
        mission={mission}
        segment={segments[0]}
        maxIncidence={maxIncidence}
        onSelect={() => onSelect(segments[0])}
      />
    )}

    {segments.length === 0 && (
      <>
        <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>

        {reason ? (
          <p className="text-primary text-xs">{reason}</p>
        ) : (
          <>
            <p className="text-primary text-xs">For the Direct to satellite tasking</p>
            <p className="text-xs font-bold text-slate-900">please adjust your parameters</p>
            <div className="space-y-1 rounded bg-red-50 px-3 py-2">
              {MISSION_LIMITS[mission].map((limit) => (
                <p key={limit.label} className="text-[11.5px] text-slate-700">
                  {limit.label} <span className="font-medium text-orange-600">{limit.value}</span>
                </p>
              ))}
            </div>
          </>
        )}
      </>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* ONE PLAN summary card                                              */
/* ------------------------------------------------------------------ */

interface OnePlanCardProps {
  mission: MissionKey;
  progType: TaskingProgType | null;
  startDate: string;
  endDate: string;
  maxIncidence: number;
  cloudCover: number;
  reason: string | null;
  onSelect: () => void;
  className?: string;
}

const OnePlanCard: React.FC<OnePlanCardProps> = ({
  mission,
  progType,
  startDate,
  endDate,
  maxIncidence,
  reason,
  onSelect,
  className = "p-4",
}) => {
  const hasErrors = Boolean(progType?.errors && progType.errors.length > 0);
  const isAvailable = Boolean(progType?.available && !hasErrors);

  if (!progType || !isAvailable || hasErrors) {
    const errorItems: Array<{ label: string; value: string }> =
      progType?.errors && progType.errors.length > 0
        ? (() => {
            const seen = new Set<string>();
            const items: Array<{ label: string; value: string }> = [];
            for (const err of progType.errors) {
              if (seen.has(err.code)) continue;
              seen.add(err.code);
              const cleanMsg = err.message.split(":")[0]?.trim() || err.message;
              const upperCode = err.code.toUpperCase();
              if (upperCode.includes("AREA") || upperCode.includes("SURFACE")) {
                const val = cleanMsg.endsWith("km2") ? cleanMsg : `${cleanMsg}km2`;
                items.push({ label: "AOI area must not exceed", value: val });
              } else if (upperCode.includes("HEIGHT")) {
                const val = cleanMsg.endsWith("km") ? cleanMsg : `${cleanMsg}km`;
                items.push({ label: "AOI height must not exceed", value: val });
              } else if (upperCode.includes("WIDTH")) {
                const val = cleanMsg.endsWith("km") ? cleanMsg : `${cleanMsg}km`;
                items.push({ label: "AOI width must not exceed", value: val });
              } else if (upperCode.includes("DELAY")) {
                const val = cleanMsg.endsWith("days") ? cleanMsg : `${cleanMsg} days`;
                items.push({ label: "Acquisition delay must not exceed", value: val });
              } else if (upperCode.includes("INCIDENCE")) {
                const val = cleanMsg.endsWith("°") ? cleanMsg : `${cleanMsg}°`;
                items.push({ label: "Incidence angle must not exceed", value: val });
              } else if (upperCode.includes("CLOUD")) {
                const val = cleanMsg.endsWith("%") ? cleanMsg : `${cleanMsg}%`;
                items.push({ label: "Cloud cover must not exceed", value: val });
              } else {
                items.push({
                  label: err.code.replace(/^ERROR_/, "").replace(/_/g, " "),
                  value: cleanMsg,
                });
              }
            }
            return items;
          })()
        : MISSION_LIMITS[mission] || [];

    return (
      <div className={`space-y-2 ${className}`}>
        <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>

        {reason ? (
          <p className="text-primary text-xs">{reason}</p>
        ) : (
          <>
            <p className="text-primary text-xs">For the Direct to satellite tasking</p>
            <p className="text-xs font-bold text-slate-900">please adjust your parameters</p>
            <div className="space-y-1 rounded bg-red-50 px-3 py-2">
              {errorItems.map((item, i) => (
                <p key={i} className="text-[11.5px] text-slate-700">
                  {item.label} <span className="font-medium text-orange-600">{item.value}</span>
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Available pass
  const segment = progType.segments && progType.segments.length > 0 ? progType.segments[0] : null;
  const deadlineIso =
    segment?.orderDeadline ||
    progType.expirationDate ||
    `${addDays(startDate, -1)}T20:00:00Z`;

  const displayDate = segment
    ? `${formatDay(segment.acquisitionStartDate)} ${formatTime(segment.acquisitionStartDate)}`
    : startDate === endDate
    ? `${formatDay(startDate)} 05:06`
    : `${formatDay(startDate)} - ${formatDay(endDate)}`;

  const angleVal = segment
    ? segment.incidenceAngle.toFixed(2)
    : (maxIncidence <= 50 ? 46.94 : maxIncidence - 3.06).toFixed(2);

  return (
    <div className={`space-y-1 ${className}`}>
      <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>

      <p className="text-[11.5px] text-slate-700">{displayDate}</p>

      <p className="text-[11.5px] text-slate-700">
        Incidence angle:{" "}
        <span className="font-bold text-slate-900">{angleVal}°</span> - {maxIncidence}°
      </p>

      <p className="text-[11.5px] text-slate-700">
        Order deadline: {formatDay(deadlineIso)} {formatTime(deadlineIso)} (UTC)
      </p>

      <button
        type="button"
        onClick={onSelect}
        className="bg-primary hover:bg-primary/90 mt-2 rounded-md px-5 py-2 text-xs font-semibold tracking-wide text-white"
      >
        SELECT
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export const TaskingMenu: React.FC = () => {
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);
  const { accessToken } = useAuthStore();
  const layers = useLayersStore((state) => state.layers);

  const aoiLayers = useMemo(
    () => layers.filter((layer) => AOI_TYPES.includes(layer.type)),
    [layers]
  );

  // Window starts from today.
  const minStart = useMemo(() => earliestAcquisitionDate(), []);

  /* Filters */
  const [startDate, setStartDate] = useState(minStart);
  const [endDate, setEndDate] = useState(() => addDays(minStart, 7));
  const [sensorIndex, setSensorIndex] = useState(0);
  const [mode, setMode] = useState<AcquisitionMode>("MONO");
  const [incidenceAngle, setIncidenceAngle] = useState(INCIDENCE_OPTIONS[2]);
  const [cloudCover, setCloudCover] = useState(CLOUD_OPTIONS[1]);

  /* Results */
  const [result, setResult] = useState<TaskingAttemptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<ProgTypeKey[]>(PROG_TYPES);
  // The pass being ordered. Set by SELECT, cleared by Cancel.
  const [orderPass, setOrderPass] = useState<{
    mission: MissionKey;
    progType: ProgTypeKey;
    segment?: TaskingSegment;
    feasibility?: TaskingFeasibility;
  } | null>(null);

  // The programme opened out into the day-by-day view, and which page it's on.
  const [detailProgType, setDetailProgType] = useState<ProgTypeKey | null>(null);
  const [dayPage, setDayPage] = useState(0);

  // Only the newest search is allowed to write its answer into state.
  const searchId = useRef(0);

  const selectedAoi = aoiLayers.find((layer) => layer.id === selectedAOIId);
  const sensorMissions = SENSORS[sensorIndex].missions;

  // Missions the API can actually be asked about with this mode.
  const missions = sensorMissions.filter((mission) => supportsMode(mission, mode));

  /* Keep a valid AOI selected; the map handles moving the view. */
  useEffect(() => {
    if (!aoiLayers.some((layer) => layer.id === selectedAOIId)) {
      setSelectedAOI(aoiLayers[0]?.id ?? null);
    }
  }, [aoiLayers, selectedAOIId, setSelectedAOI]);

  /* Search whenever a filter changes. */
  useEffect(() => {
    const rings = selectedAoi ? polygonRings(selectedAoi.geojson) : null;
    const progTypeNames = PROG_TYPES.filter((progType) =>
      missions.some((mission) => supportsProgType(mission, progType))
    );

    if (!rings || !missions.length || !progTypeNames.length) return;

    if (startDate < minStart) {
      setError(`The capture window can't start before ${minStart}.`);
      return;
    }

    const timer = window.setTimeout(async () => {
      const id = searchId.current + 1;
      searchId.current = id;

      setIsLoading(true);
      setError(null);
      setResult(null);
      setDetailProgType(null);

      try {
        const attemptProgTypes = progTypeNames.filter(
          (pt) => pt === "ONEDAY" || pt === "ONENOW"
        );
        const hasOnePlan = progTypeNames.includes("ONEPLAN");

        const basePayload = {
          acquisitionStartDate: `${startDate}T00:00:00Z`,
          acquisitionEndDate: `${endDate}T23:59:59Z`,
          missions,
          acquisitionMode: mode,
          maxCloudCover: cloudCover,
          maxIncidenceAngle: incidenceAngle,
          aoi: { type: "Polygon" as const, coordinates: rings },
        };

        const promises: [
          Promise<TaskingAttemptResponse | null>,
          Promise<TaskingAttemptResponse | null>
        ] = [
          attemptProgTypes.length > 0
            ? FetchAttempt(
                { ...basePayload, progTypeNames: attemptProgTypes as ("ONEDAY" | "ONENOW")[] },
                accessToken ?? ""
              )
            : Promise.resolve(null),
          hasOnePlan
            ? FetchFeasibility(
                { ...basePayload, progTypeNames: ["ONEPLAN"] },
                accessToken ?? ""
              )
            : Promise.resolve(null),
        ];

        const [attemptResult, feasibilityResult] = await Promise.allSettled(promises);

        if (id !== searchId.current) return;

        let mergedCapacities: Array<{ mission: MissionKey; progTypes: TaskingProgType[] }> = [];
        let mergedSegments: TaskingSegment[] = [];
        let hasAnySuccess = false;
        let lastErrorMsg: string | null = null;

        if (attemptResult.status === "fulfilled" && attemptResult.value) {
          hasAnySuccess = true;
          if (attemptResult.value.progCapacities) {
            mergedCapacities = [...attemptResult.value.progCapacities];
          }
          if (attemptResult.value.segments) {
            mergedSegments = [...attemptResult.value.segments];
          }
        } else if (attemptResult.status === "rejected") {
          lastErrorMsg = await apiErrorMessage(attemptResult.reason, accessToken ?? "");
        }

        if (feasibilityResult.status === "fulfilled" && feasibilityResult.value) {
          hasAnySuccess = true;
          const fCaps: Array<{ mission: MissionKey; progTypes: TaskingProgType[] }> | undefined =
            Array.isArray(feasibilityResult.value)
              ? (feasibilityResult.value as any)
              : feasibilityResult.value.progCapacities;
          if (fCaps) {
            fCaps.forEach((fc) => {
              const existing = mergedCapacities.find((c) => c.mission === fc.mission);
              if (existing) {
                const newPts = fc.progTypes.filter(
                  (pt) => !existing.progTypes.some((ept) => ept.name === pt.name)
                );
                existing.progTypes.push(...newPts);
              } else {
                mergedCapacities.push({ ...fc });
              }
            });
          }
          if (feasibilityResult.value.segments) {
            mergedSegments.push(...feasibilityResult.value.segments);
          }
        } else if (feasibilityResult.status === "rejected") {
          const msg = await apiErrorMessage(feasibilityResult.reason, accessToken ?? "");
          if (!lastErrorMsg) lastErrorMsg = msg;
        }

        if (hasAnySuccess) {
          setResult({
            success: true,
            progCapacities: mergedCapacities,
            segments: mergedSegments,
          });
        } else {
          setError(lastErrorMsg || "Could not load passes from the tasking service.");
        }
      } catch (caught) {
        if (id !== searchId.current) return;
        const msg = await apiErrorMessage(caught, accessToken ?? "");
        setError(msg || "Could not load passes from the tasking service.");
      } finally {
        if (id === searchId.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAoi,
    minStart,
    startDate,
    endDate,
    sensorIndex,
    mode,
    cloudCover,
    incidenceAngle,
    accessToken,
  ]);

  /** Segments the API returned for one mission and programme. */
  const segmentsFor = (mission: MissionKey, progType: ProgTypeKey) => {
    const capacity = result?.progCapacities.find((c) => c.mission === mission);
    if (!capacity) return [];

    const matchingProgTypes = capacity.progTypes.filter(
      (entry) =>
        entry.name === progType ||
        (progType === "ONENOW" && (entry.name === "ONENOWATTEMPTS" || entry.name === "ONENOW"))
    );

    const segments: TaskingSegment[] = [];
    const seen = new Set<string>();

    for (const pt of matchingProgTypes) {
      if (pt.available && pt.segments) {
        for (const seg of pt.segments) {
          const key = seg.id || seg.segmentKey;
          if (!seen.has(key)) {
            seen.add(key);
            segments.push(seg);
          }
        }
      }
    }

    return segments;
  };

  /** ONEPLAN progType entry for a mission. */
  const onePlanFor = (mission: MissionKey): TaskingProgType | null => {
    const capacity = result?.progCapacities.find((c) => c.mission === mission);
    if (!capacity) return null;
    return capacity.progTypes.find((pt) => pt.name === "ONEPLAN") ?? null;
  };

  /** Why a mission has no passes, when the reason is a rule rather than capacity. */
  const reasonFor = (mission: MissionKey, progType: ProgTypeKey) => {
    if (!supportsMode(mission, mode)) return `${MODE_LABELS[mode]} isn't offered on this mission.`;
    if (!supportsProgType(mission, progType)) {
      return `${PROG_TYPE_META[progType].title} isn't offered on this mission.`;
    }
    return null;
  };

  /** Every pass in a programme, grouped by the UTC day it lands on. */
  const daysFor = (progType: ProgTypeKey) => {
    const byDay = new Map<string, Array<{ mission: MissionKey; segment: TaskingSegment }>>();

    sensorMissions.forEach((mission) => {
      segmentsFor(mission, progType).forEach((segment) => {
        const day = segment.acquisitionStartDate.slice(0, 10);
        byDay.set(day, [...(byDay.get(day) ?? []), { mission, segment }]);
      });
    });

    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const openDetail = (progType: ProgTypeKey) => {
    setDetailProgType(progType);
    setDayPage(0);
  };

  const toggleSection = (progType: ProgTypeKey) =>
    setOpenSections((open) =>
      open.includes(progType) ? open.filter((item) => item !== progType) : [...open, progType]
    );

  /* ---------------------------------------------------------------- */

  if (!aoiLayers.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center select-none">
        <p className="text-primary mb-4 max-w-[240px] text-sm font-semibold sm:text-base">
          Draw an area of interest to start tasking.
        </p>
        <div className="border-primary bg-primary/10 hover:bg-primary/30 flex h-12 w-12 cursor-pointer items-center justify-center rounded border shadow-sm">
          <AoiDrawIcon />
        </div>
      </div>
    );
  }

  if (orderPass) {
    const rings = selectedAoi ? polygonRings(selectedAoi.geojson) : null;

    if (rings) {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <TaskingOrderForm
            aoiLabel={selectedAoi?.label ?? "Area of interest"}
            rings={rings}
            mission={orderPass.mission}
            progType={orderPass.progType}
            acquisitionMode={mode}
            segment={orderPass.segment}
            feasibility={orderPass.feasibility}
            startDate={startDate}
            endDate={endDate}
            cloudCover={cloudCover}
            maxIncidence={incidenceAngle}
            onCancel={() => setOrderPass(null)}
            onSubmitted={() => setOrderPass(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Filters */}
      <div className="border-border shrink-0 space-y-2.5 border-b px-4 py-3">
        <div>
          <label className={labelStyle} htmlFor="tasking-start">
            Capture window
          </label>
          <div className="flex items-center gap-2">
            <input
              id="tasking-start"
              type="date"
              value={startDate}
              min={minStart}
              onChange={(event) => {
                const newStart = event.target.value;
                setStartDate(newStart);
                if (newStart) {
                  setEndDate(addDays(newStart, 7));
                }
              }}
              className={field}
            />
            <span className="text-text-secondary shrink-0 text-[11px]">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="End of capture window"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={labelStyle} htmlFor="tasking-aoi">
            Area of interest
          </label>
          <select
            id="tasking-aoi"
            value={selectedAOIId ?? ""}
            onChange={(event) => setSelectedAOI(event.target.value)}
            className={field}
          >
            {aoiLayers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelStyle} htmlFor="tasking-sensor">
              Sensor
            </label>
            <select
              id="tasking-sensor"
              value={sensorIndex}
              onChange={(event) => setSensorIndex(Number(event.target.value))}
              className={field}
            >
              {SENSORS.map((sensor, index) => (
                <option key={sensor.label} value={index}>
                  {sensor.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle} htmlFor="tasking-mode">
              Acquisition mode
            </label>
            <select
              id="tasking-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as AcquisitionMode)}
              className={field}
            >
              {MODES.map((option) => (
                <option
                  key={option}
                  value={option}
                  disabled={!sensorMissions.some((mission) => supportsMode(mission, option))}
                >
                  {MODE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle} htmlFor="tasking-incidence">
              Incidence angle
            </label>
            <select
              id="tasking-incidence"
              value={incidenceAngle}
              onChange={(event) => setIncidenceAngle(Number(event.target.value))}
              className={field}
            >
              {INCIDENCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  ≤ {value}°
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle} htmlFor="tasking-cloud">
              Cloud cover
            </label>
            <select
              id="tasking-cloud"
              value={cloudCover}
              onChange={(event) => setCloudCover(Number(event.target.value))}
              className={field}
            >
              {CLOUD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  ≤ {value}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!result && !isLoading && !error && (
          <div className="border-border rounded-lg border border-dashed bg-white px-4 py-8 text-center">
            <p className="text-primary text-xs font-semibold">No passes yet</p>
            <p className="text-text-secondary mt-1 text-[11px]">
              Adjust the window or sensor and the results refresh on their own.
            </p>
          </div>
        )}

        {(result || isLoading) &&
          PROG_TYPES.map((progType) => {
            const meta = PROG_TYPE_META[progType];
            const isOpen = openSections.includes(progType);
            const isDetail = detailProgType === progType;
            const isOnePlan = progType === "ONEPLAN";

            const onePlanFeasibleCount = sensorMissions.filter((mission) => {
              const pt = onePlanFor(mission);
              return pt && pt.available && (!pt.errors || pt.errors.length === 0);
            }).length;

            const days = isOnePlan ? [] : daysFor(progType);
            const passCount = isOnePlan
              ? onePlanFeasibleCount
              : days.reduce((total, [, passes]) => total + passes.length, 0);
            const missionsWithPasses = isOnePlan
              ? onePlanFeasibleCount
              : sensorMissions.filter(
                  (mission) => segmentsFor(mission, progType).length > 0
                ).length;

            // The summary only shows each mission's soonest pass.
            // For ONEPLAN, show VIEW MORE if there are more than 2 missions.
            const hasMore = isOnePlan
              ? sensorMissions.length > 2
              : passCount > missionsWithPasses;
            const lastPage = isOnePlan ? 0 : Math.ceil(days.length / DAYS_PER_PAGE) - 1;
            const pageDays = isOnePlan
              ? []
              : days.slice(dayPage * DAYS_PER_PAGE, (dayPage + 1) * DAYS_PER_PAGE);

            return (
              <section key={progType} className="border-border overflow-hidden rounded-lg border">
                <div className="bg-primary-100 flex items-start gap-2 px-3.5 py-2.5">
                  {isDetail && (
                    <button
                      type="button"
                      onClick={() => setDetailProgType(null)}
                      aria-label={`Back to the ${meta.title} summary`}
                      className="text-primary mt-0.5 shrink-0"
                    >
                      <ArrowLeft size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => !isDetail && toggleSection(progType)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-bold tracking-wide text-slate-900">
                        {meta.title}
                      </span>
                      <span className="text-text-secondary mt-0.5 block text-[11px]">
                        {meta.blurb} |{" "}
                        <span className="font-semibold text-slate-700">Cloud coverage:</span>{" "}
                        {meta.cloud}
                      </span>
                    </span>

                    {!isDetail && (
                      <span className="flex shrink-0 items-center gap-2 pt-0.5">
                        <span className="text-text-secondary text-[11px]">
                          {isLoading
                            ? ""
                            : passCount
                              ? `${passCount} pass${passCount === 1 ? "" : "es"}`
                              : "No passes"}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-primary ${isOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    )}
                  </button>
                </div>

                {/* Waiting on the search */}
                {isOpen && isLoading && (
                  <div className="flex items-center justify-center bg-white py-6">
                    <Loader2 size={20} className="text-primary/70 animate-spin" />
                    <span className="sr-only">Loading passes</span>
                  </div>
                )}

                {/* Summary: one card per mission */}
                {isOpen && !isLoading && !isDetail && (
                  <div className="bg-white">
                    <div className="divide-border grid grid-cols-1 divide-y sm:grid-cols-2">
                      {isOnePlan
                        ? sensorMissions.map((mission) => {
                            const pt = onePlanFor(mission);
                            return (
                              <OnePlanCard
                                key={mission}
                                mission={mission}
                                progType={pt}
                                startDate={startDate}
                                endDate={endDate}
                                maxIncidence={incidenceAngle}
                                cloudCover={cloudCover}
                                reason={reasonFor(mission, progType)}
                                onSelect={() =>
                                  setOrderPass({
                                    mission,
                                    progType: "ONEPLAN",
                                    feasibility: pt?.feasibility,
                                    segment: {
                                      id: `oneplan-${mission}`,
                                      footprint: { geometry: "", center: "" },
                                      instrumentMode: mode,
                                      orderDeadline: pt?.expirationDate ?? "",
                                      extendedAngle: false,
                                      acquisitionStartDate: `${startDate}T00:00:00Z`,
                                      acquisitionEndDate: `${endDate}T23:59:59Z`,
                                      incidenceAngle,
                                      segmentKey: "",
                                      acrossTrackIncidenceAngle: 0,
                                    },
                                  })
                                }
                              />
                            );
                          })
                        : sensorMissions.map((mission) => (
                            <MissionCard
                              key={mission}
                              mission={mission}
                              segments={segmentsFor(mission, progType)}
                              reason={reasonFor(mission, progType)}
                              maxIncidence={incidenceAngle}
                              onSelect={(segment) =>
                                setOrderPass({ mission, progType, segment })
                              }
                            />
                          ))}
                    </div>

                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => openDetail(progType)}
                        className="text-primary border-border w-full border-t py-2.5 text-xs font-semibold tracking-wide hover:bg-slate-50"
                      >
                        VIEW MORE
                      </button>
                    )}
                  </div>
                )}

                {/* Detail: passes day by day OR one plan full breakdown */}
                {isDetail && !isLoading && (
                  <div className="bg-white p-4">
                    {isOnePlan ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-slate-900">
                            Detailed Plan Breakdown
                          </h5>
                          <span className="text-text-secondary text-xs">
                            {sensorMissions.length} sensors evaluated
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {sensorMissions.map((mission) => {
                            const pt = onePlanFor(mission);
                            return (
                              <div
                                key={mission}
                                className="border-border rounded-lg border bg-white p-3 shadow-sm"
                              >
                                <OnePlanCard
                                  mission={mission}
                                  progType={pt}
                                  startDate={startDate}
                                  endDate={endDate}
                                  maxIncidence={incidenceAngle}
                                  cloudCover={cloudCover}
                                  reason={reasonFor(mission, progType)}
                                  className="p-0"
                                  onSelect={() =>
                                    setOrderPass({
                                      mission,
                                      progType: "ONEPLAN",
                                      feasibility: pt?.feasibility,
                                      segment: {
                                        id: `oneplan-${mission}`,
                                        footprint: { geometry: "", center: "" },
                                        instrumentMode: mode,
                                        orderDeadline: pt?.expirationDate ?? "",
                                        extendedAngle: false,
                                        acquisitionStartDate: `${startDate}T00:00:00Z`,
                                        acquisitionEndDate: `${endDate}T23:59:59Z`,
                                        incidenceAngle,
                                        segmentKey: "",
                                        acrossTrackIncidenceAngle: 0,
                                      },
                                    })
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setDayPage((page) => Math.max(0, page - 1))}
                            disabled={dayPage === 0}
                            aria-label="Earlier days"
                            className="text-primary disabled:opacity-30"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDayPage((page) => Math.min(lastPage, page + 1))}
                            disabled={dayPage >= lastPage}
                            aria-label="Later days"
                            className="text-primary disabled:opacity-30"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {pageDays.map(([day, passes]) => (
                            <div key={day}>
                              <h5 className="text-center text-sm font-bold text-slate-900">
                                {formatDay(day)}
                              </h5>

                              <div className="mt-3 space-y-3">
                                {passes.map(({ mission, segment }) => (
                                  <div
                                    key={segment.segmentKey}
                                    className="border-border rounded-lg border bg-white p-3 shadow-sm"
                                  >
                                    <PassCard
                                      mission={mission}
                                      segment={segment}
                                      maxIncidence={incidenceAngle}
                                      onSelect={() => setOrderPass({ mission, progType, segment })}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};