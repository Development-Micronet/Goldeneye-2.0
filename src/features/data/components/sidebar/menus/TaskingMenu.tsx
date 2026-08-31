import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import axios from "axios";

import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import {
  FetchAttempt,
  MISSIONS,
  MISSION_LIMITS,
  MODES,
  MODE_LABELS,
  PROG_TYPES,
  PROG_TYPE_META,
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const plusDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

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
/* Mission card                                                        */
/* ------------------------------------------------------------------ */

interface MissionCardProps {
  mission: MissionKey;
  segments: TaskingSegment[];
  reason: string | null;
  selectedKey?: string;
  onSelect: (segment: TaskingSegment) => void;
}

const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  segments,
  reason,
  selectedKey,
  onSelect,
}) => (
  <div className="space-y-2 p-4">
    <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>

    {segments.length > 0 &&
      segments.map((segment) => {
        const isSelected = segment.segmentKey === selectedKey;

        return (
          <div
            key={segment.segmentKey}
            className={`rounded-md border px-2.5 py-2 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-white"
              }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-primary text-xs font-semibold">
                {formatDay(segment.acquisitionStartDate)}
              </span>
              <span className="text-text-secondary text-[11px]">
                {formatTime(segment.acquisitionStartDate)}
              </span>
            </div>

            <p className="text-text-muted mt-1 text-[11px]">
              {segment.incidenceAngle.toFixed(1)}° incidence · {segment.instrumentMode}
            </p>
            <p className="text-text-muted text-[11px]">
              Order by {formatDay(segment.orderDeadline)}
            </p>

            <button
              type="button"
              onClick={() => onSelect(segment)}
              className={`mt-2 w-full rounded-md px-3 py-1.5 text-[11px] font-semibold ${isSelected
                ? "bg-primary text-white"
                : "border-primary text-primary hover:bg-primary/10 border"
                }`}
            >
              {isSelected ? "Selected" : "Select this pass"}
            </button>
          </div>
        );
      })}

    {segments.length === 0 && reason && <p className="text-primary text-xs">{reason}</p>}

    {segments.length === 0 && !reason && (
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

  const today = useMemo(() => new Date(), []);

  /* Filters */
  const [startDate, setStartDate] = useState(toInputDate(today));
  const [endDate, setEndDate] = useState(toInputDate(plusDays(today, 30)));
  const [sensorIndex, setSensorIndex] = useState(0);
  const [mode, setMode] = useState<AcquisitionMode>("MONO");
  const [incidenceAngle, setIncidenceAngle] = useState(INCIDENCE_OPTIONS[2]);
  const [cloudCover, setCloudCover] = useState(CLOUD_OPTIONS[1]);

  /* Results */
  const [result, setResult] = useState<TaskingAttemptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<ProgTypeKey[]>(PROG_TYPES);
  const [selectedKey, setSelectedKey] = useState<string>();

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

    const timer = window.setTimeout(async () => {
      const id = searchId.current + 1;
      searchId.current = id;

      setIsLoading(true);
      setError(null);
      setSelectedKey(undefined);

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
        setError(
          (axios.isAxiosError(caught) && caught.response?.data?.detail) ||
          "Could not load passes from the tasking service."
        );
      } finally {
        if (id === searchId.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAoi,
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
              min={toInputDate(today)}
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
        {isLoading && (
          <p className="text-text-secondary flex items-center gap-1.5 text-[11px]">
            <Loader2 size={12} className="animate-spin" />
            Checking passes over {selectedAoi?.label ?? "your area"}
          </p>
        )}

        {!result && !isLoading && !error && (
          <div className="border-border rounded-lg border border-dashed bg-white px-4 py-8 text-center">
            <p className="text-primary text-xs font-semibold">No passes yet</p>
            <p className="text-text-secondary mt-1 text-[11px]">
              Adjust the window or sensor and the results refresh on their own.
            </p>
          </div>
        )}

        {result &&
          PROG_TYPES.map((progType) => {
            const meta = PROG_TYPE_META[progType];
            const isOpen = openSections.includes(progType);
            const passCount = sensorMissions.reduce(
              (total, mission) => total + segmentsFor(mission, progType).length,
              0
            );

            return (
              <section key={progType} className="border-border overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleSection(progType)}
                  aria-expanded={isOpen}
                  className="bg-primary-100 flex w-full items-start justify-between gap-3 px-3.5 py-2.5 text-left"
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
                  <span className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="text-text-secondary text-[11px]">
                      {passCount ? `${passCount} pass${passCount === 1 ? "" : "es"}` : "No passes"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-primary ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="divide-border grid grid-cols-1 divide-y bg-white sm:grid-cols-2">
                    {sensorMissions.map((mission) => (
                      <MissionCard
                        key={mission}
                        mission={mission}
                        segments={segmentsFor(mission, progType)}
                        reason={reasonFor(mission, progType)}
                        selectedKey={selectedKey}
                        onSelect={(segment) =>
                          setSelectedKey((current) =>
                            current === segment.segmentKey ? undefined : segment.segmentKey
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};