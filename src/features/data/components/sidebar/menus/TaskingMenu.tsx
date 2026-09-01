import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import {
  FetchAttempt,
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
const AOI_TYPES = ["Polygon", "Box", "Coordinates", "Bound Coordinates"];
const DEBOUNCE_MS = 500;

/** Days shown side by side once the section is opened out. */
const DAYS_PER_PAGE = 2;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Shift a yyyy-mm-dd string by a number of days. */
const addDays = (isoDay: string, days: number) => {
  const date = new Date(isoDay);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

/** The summary shows the soonest pass; the rest live behind View more. */
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

  // Airbus needs a month of lead time, so the window can't start today.
  const minStart = useMemo(() => earliestAcquisitionDate(), []);

  /* Filters */
  const [startDate, setStartDate] = useState(minStart);
  const [endDate, setEndDate] = useState(() => addDays(minStart, 30));
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
    segment: TaskingSegment;
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
        const data = await FetchAttempt(
          {
            acquisitionStartDate: `${startDate}T00:00:00Z`,
            acquisitionEndDate: `${endDate}T23:59:59Z`,
            missions,
            progTypeNames,
            acquisitionMode: mode,
            maxCloudCover: cloudCover,
            maxIncidenceAngle: incidenceAngle,
            aoi: { type: "Polygon", coordinates: rings },
          },
          accessToken ?? ""
        );

        if (id === searchId.current) setResult(data);
      } catch (caught) {
        if (id !== searchId.current) return;
        setError(apiErrorMessage(caught) || "Could not load passes from the tasking service.");
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
    const record = result?.progCapacities
      .find((capacity) => capacity.mission === mission)
      ?.progTypes.find((entry) => entry.name === progType);

    return record?.available ? record.segments ?? [] : [];
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
              onChange={(event) => setStartDate(event.target.value)}
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

            const days = daysFor(progType);
            const passCount = days.reduce((total, [, passes]) => total + passes.length, 0);
            const missionsWithPasses = sensorMissions.filter(
              (mission) => segmentsFor(mission, progType).length > 0
            ).length;

            // The summary only shows each mission's soonest pass. One Now has
            // no day-by-day view, so it never opens out.
            const hasMore = progType !== "ONENOW" && passCount > missionsWithPasses;
            const lastPage = Math.ceil(days.length / DAYS_PER_PAGE) - 1;
            const pageDays = days.slice(dayPage * DAYS_PER_PAGE, (dayPage + 1) * DAYS_PER_PAGE);

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
                      {sensorMissions.map((mission) => (
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

                {/* Detail: passes day by day */}
                {isDetail && !isLoading && (
                  <div className="bg-white p-4">
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
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};