import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, ChevronDown, Clock, Gauge, Loader2 } from "lucide-react";
import { transformExtent } from "ol/proj";
import axios from "axios";

import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import {
  ACQUISITION_MODES,
  ACQUISITION_MODE_LABELS,
  FetchAttempt,
  MISSIONS,
  MISSION_LABELS,
  PROG_TYPE_META,
  PROG_TYPE_ORDER,
  explainUnavailable,
  missionSupportsMode,
  missionSupportsProgType,
  modeNeedsContract,
  orderEndpointFor,
  validateAttemptPayload,
} from "../api/Tasking.service";
import type {
  AcquisitionMode,
  MissionKey,
  ProgTypeKey,
  TaskingAttemptPayload,
  TaskingAttemptResponse,
  TaskingProgType,
  TaskingSegment,
} from "../api/Tasking.service";
import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../../../store/useLayersStore";
import { useAuthStore } from "../../../../../store/useAuthStore";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const SENSOR_OPTIONS: Array<{ label: string; missions: MissionKey[] }> = [
  { label: "All sensors", missions: MISSIONS },
  { label: "Pléiades", missions: ["PLEIADES"] },
  { label: "SPOT", missions: ["SPOT"] },
  { label: "Pléiades Neo", missions: ["PLEIADESNEO"] },
];

const INCIDENCE_OPTIONS = [20, 30, 50];
const CLOUD_OPTIONS = [5, 10, 20];
const AOI_TYPES = ["Polygon", "Box", "Coordinates", "Bound Coordinates"];

/** Filters change on every keystroke of a date field, so settle first. */
const SEARCH_DEBOUNCE_MS = 500;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Layers store either a Feature or a bare geometry, so accept both. */
const toGeometry = (geojson: any) => geojson?.geometry ?? geojson ?? null;

const toPolygonCoordinates = (geojson: any): number[][][] | null => {
  const geometry = toGeometry(geojson);
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates?.[0] ?? null;
  return null;
};

/** Bounding box of a polygon's outer ring, in lon/lat. */
const extentOf = (coordinates: number[][][]): [number, number, number, number] | null => {
  const ring = coordinates?.[0];
  if (!ring?.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  ring.forEach(([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return Number.isFinite(minX) && maxX > -Infinity ? [minX, minY, maxX, maxY] : null;
};

const fieldClass =
  "border-border text-text-muted focus:border-primary focus:ring-primary/30 w-full min-w-0 rounded-md border bg-white px-2 py-1.5 text-xs outline-none transition-colors focus:ring-1";

const labelClass = "text-primary mb-1 block text-xs font-semibold";

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const MissionUnavailable: React.FC<{
  mission: MissionKey;
  progType: ProgTypeKey;
  record?: TaskingProgType;
}> = ({ mission, progType, record }) => {
  const { headline, lines } = explainUnavailable(mission, progType, record);

  return (
    <div>
      <h4 className="text-[13px] font-bold tracking-wide text-slate-900">{mission}</h4>
      <p className="text-primary mt-1 text-xs">{headline}</p>
      {lines.length > 0 && (
        <>
          <p className="mt-0.5 text-xs font-bold text-slate-900">please adjust your parameters</p>
          <div className="mt-2 space-y-1 rounded bg-red-50 px-3 py-2">
            {lines.map((line) => {
              // The trailing figure carries the limit, so it gets the accent.
              const split = line.lastIndexOf(" ");
              const label = split > 0 ? line.slice(0, split) : line;
              const value = split > 0 ? line.slice(split + 1) : "";

              return (
                <p key={line} className="text-[11.5px] text-slate-700">
                  {label} <span className="font-medium text-orange-600">{value}</span>
                </p>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const SegmentRow: React.FC<{
  segment: TaskingSegment;
  selected: boolean;
  onSelect: () => void;
}> = ({ segment, selected, onSelect }) => (
  <div
    className={`rounded-md border px-2.5 py-2 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
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

    <dl className="mt-1.5 space-y-1">
      <div className="text-text-muted flex items-center gap-1.5 text-[11px]">
        <Gauge size={11} className="shrink-0" />
        <dt className="sr-only">Incidence angle</dt>
        <dd>
          {segment.incidenceAngle.toFixed(1)}° incidence
          {segment.extendedAngle ? " (extended)" : ""}
        </dd>
      </div>
      <div className="text-text-muted flex items-center gap-1.5 text-[11px]">
        <Camera size={11} className="shrink-0" />
        <dt className="sr-only">Instrument mode</dt>
        <dd>{segment.instrumentMode}</dd>
      </div>
      <div className="text-text-muted flex items-center gap-1.5 text-[11px]">
        <Clock size={11} className="shrink-0" />
        <dt className="sr-only">Order deadline</dt>
        <dd>Order by {formatDay(segment.orderDeadline)}</dd>
      </div>
    </dl>

    <button
      type="button"
      onClick={onSelect}
      className={`mt-2 w-full rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${selected
        ? "bg-primary text-white"
        : "border-primary text-primary hover:bg-primary/10 border"
        }`}
    >
      {selected ? "Selected" : "Select this pass"}
    </button>
  </div>
);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export interface TaskingSelection {
  segment: TaskingSegment;
  mission: MissionKey;
  progType: ProgTypeKey;
  orderEndpoint?: string;
}

interface TaskingMenuProps {
  onContinue?: (selection: TaskingSelection) => void;
}

export const TaskingMenu: React.FC<TaskingMenuProps> = ({ onContinue }) => {
  // Read-only: the panel follows the map's selection but never sets it.
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const map = useSelectedAOIStore((state) => state.map);

  const { accessToken } = useAuthStore();
  const layers = useLayersStore((state) => state.layers);

  const aoiLayers = useMemo(
    () => layers.filter((layer) => AOI_TYPES.includes(layer.type)),
    [layers]
  );

  /* Filters */
  const today = useMemo(() => new Date(), []);
  const [aoiId, setAoiId] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(today));
  const [endDate, setEndDate] = useState(toInputDate(addDays(today, 30)));
  const [sensorIndex, setSensorIndex] = useState(0);
  const [incidenceAngle, setIncidenceAngle] = useState(INCIDENCE_OPTIONS[0]);
  const [cloudCover, setCloudCover] = useState(CLOUD_OPTIONS[1]);
  const [acquisitionMode, setAcquisitionMode] = useState<AcquisitionMode>("MONO");

  /* Results */
  const [result, setResult] = useState<TaskingAttemptResponse | null>(null);
  const [searchedMissions, setSearchedMissions] = useState<MissionKey[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<ProgTypeKey>>(new Set(PROG_TYPE_ORDER));
  const [selection, setSelection] = useState<TaskingSelection | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fittedAoiRef = useRef<string | null>(null);

  // Fall back to the first AOI, follow the map's pick, and let go if deleted.
  useEffect(() => {
    if (!aoiLayers.length) {
      setAoiId("");
      return;
    }

    const fromMap = aoiLayers.find((layer) => layer.id === selectedAOIId);
    if (fromMap) {
      setAoiId(fromMap.id);
      return;
    }

    setAoiId((current) =>
      aoiLayers.some((layer) => layer.id === current) ? current : aoiLayers[0].id
    );
  }, [aoiLayers, selectedAOIId]);

  const selectedAoi = aoiLayers.find((layer) => layer.id === aoiId);
  const chosenMissions = SENSOR_OPTIONS[sensorIndex].missions;

  // Frame the AOI once per change, so edits and renames don't move the view.
  useEffect(() => {
    if (!map || !aoiId || fittedAoiRef.current === aoiId) return;

    const layer = aoiLayers.find((item) => item.id === aoiId);
    const coordinates = layer ? toPolygonCoordinates(layer.geojson) : null;
    const extent = coordinates ? extentOf(coordinates) : null;
    if (!extent) return;

    const view = map.getView();
    view.fit(transformExtent(extent, "EPSG:4326", view.getProjection()), {
      padding: [40, 40, 40, 40],
      duration: 400,
      maxZoom: 16,
    });

    fittedAoiRef.current = aoiId;
  }, [map, aoiId, aoiLayers]);

  /* Compatibility, worked out before the request goes anywhere. */
  const requestMissions = useMemo(
    () => chosenMissions.filter((mission) => missionSupportsMode(mission, acquisitionMode)),
    [chosenMissions, acquisitionMode]
  );

  const droppedByMode = chosenMissions.filter(
    (mission) => !missionSupportsMode(mission, acquisitionMode)
  );

  const requestProgTypes = useMemo(
    () =>
      PROG_TYPE_ORDER.filter((progType) =>
        requestMissions.some((mission) => missionSupportsProgType(mission, progType))
      ),
    [requestMissions]
  );

  const runSearch = useCallback(async () => {
    const coordinates = selectedAoi ? toPolygonCoordinates(selectedAoi.geojson) : null;
    if (!coordinates) return;

    const payload: TaskingAttemptPayload = {
      acquisitionStartDate: `${startDate}T00:00:00Z`,
      acquisitionEndDate: `${endDate}T23:59:59Z`,
      missions: requestMissions,
      progTypeNames: requestProgTypes,
      acquisitionMode,
      maxCloudCover: cloudCover,
      maxIncidenceAngle: incidenceAngle,
      aoi: { type: "Polygon", coordinates },
    };

    const invalid = validateAttemptPayload(payload);
    if (invalid) {
      setSearchError(invalid);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    setSelection(null);

    try {
      const data = await FetchAttempt(payload, accessToken ?? "", controller.signal);
      if (controller.signal.aborted) return;

      setResult(data);
      setSearchedMissions(requestMissions);

      // Open whichever programmes actually came back with passes.
      const withPasses = requestProgTypes.filter((progType) =>
        data.progCapacities.some((capacity) =>
          capacity.progTypes.some((record) => record.name === progType && record.segments?.length)
        )
      );
      setOpenSections(new Set(withPasses.length ? withPasses : requestProgTypes));
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) return;
      if (axios.isAxiosError(error)) {
        setSearchError(
          error.response?.data?.detail ??
          error.response?.data?.message ??
          `The tasking service returned ${error.response?.status ?? "an error"}.`
        );
      } else {
        setSearchError("Could not reach the tasking service.");
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, [
    selectedAoi,
    startDate,
    endDate,
    requestMissions,
    requestProgTypes,
    acquisitionMode,
    cloudCover,
    incidenceAngle,
    accessToken,
  ]);

  // Results follow the filters; no search button to press.
  useEffect(() => {
    const timer = window.setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const progTypeFor = useCallback(
    (mission: MissionKey, name: ProgTypeKey): TaskingProgType | undefined =>
      result?.progCapacities
        .find((capacity) => capacity.mission === mission)
        ?.progTypes.find((progType) => progType.name === name),
    [result]
  );

  const toggleSection = (name: ProgTypeKey) =>
    setOpenSections((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  /* ---------------------------------------------------------------- */

  if (!aoiLayers.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center select-none">
        <p className="text-primary mb-4 max-w-[240px] text-sm font-semibold sm:text-base">
          Draw an area of interest to start tasking.
        </p>
        <div className="border-primary bg-primary/10 hover:bg-primary/30 flex h-12 w-12 cursor-pointer items-center justify-center rounded border shadow-sm transition-colors">
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
          <label className={labelClass} htmlFor="tasking-start">
            Capture window
          </label>
          <div className="flex items-center gap-2">
            <input
              id="tasking-start"
              type="date"
              value={startDate}
              min={toInputDate(today)}
              onChange={(event) => setStartDate(event.target.value)}
              className={fieldClass}
            />
            <span className="text-text-secondary shrink-0 text-[11px]">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="End of capture window"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="tasking-aoi">
            Area of interest
          </label>
          <select
            id="tasking-aoi"
            value={aoiId}
            onChange={(event) => setAoiId(event.target.value)}
            className={fieldClass}
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
            <label className={labelClass} htmlFor="tasking-sensor">
              Sensor
            </label>
            <select
              id="tasking-sensor"
              value={sensorIndex}
              onChange={(event) => setSensorIndex(Number(event.target.value))}
              className={fieldClass}
            >
              {SENSOR_OPTIONS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="tasking-mode">
              Acquisition mode
            </label>
            <select
              id="tasking-mode"
              value={acquisitionMode}
              onChange={(event) => setAcquisitionMode(event.target.value as AcquisitionMode)}
              className={fieldClass}
            >
              {ACQUISITION_MODES.map((mode) => {
                const supported = chosenMissions.some((mission) =>
                  missionSupportsMode(mission, mode)
                );
                return (
                  <option key={mode || "auto"} value={mode} disabled={!supported}>
                    {ACQUISITION_MODE_LABELS[mode]}
                    {supported ? "" : " — not on this sensor"}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="tasking-incidence">
              Incidence angle
            </label>
            <select
              id="tasking-incidence"
              value={incidenceAngle}
              onChange={(event) => setIncidenceAngle(Number(event.target.value))}
              className={fieldClass}
            >
              {INCIDENCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  ≤ {value}°
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="tasking-cloud">
              Cloud cover
            </label>
            <select
              id="tasking-cloud"
              value={cloudCover}
              onChange={(event) => setCloudCover(Number(event.target.value))}
              className={fieldClass}
            >
              {CLOUD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  ≤ {value}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {droppedByMode.length > 0 && (
          <p className="text-text-secondary text-[11px]">
            {droppedByMode.map((mission) => MISSION_LABELS[mission]).join(" and ")} sits out of these
            results — {ACQUISITION_MODE_LABELS[acquisitionMode]} isn't offered on it.
          </p>
        )}

        {modeNeedsContract(acquisitionMode) && (
          <p className="text-text-secondary text-[11px]">
            {ACQUISITION_MODE_LABELS[acquisitionMode]} needs stereo capability on your Airbus
            contract and matching passes over the area.
          </p>
        )}

        {searchError && (
          <p className="flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {searchError}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isSearching && (
          <p className="text-text-secondary flex items-center gap-1.5 text-[11px]">
            <Loader2 size={12} className="animate-spin" />
            Checking passes over {selectedAoi?.label ?? "your area"}
          </p>
        )}

        {!result && !isSearching && !searchError && (
          <div className="border-border rounded-lg border border-dashed bg-white px-4 py-8 text-center">
            <p className="text-primary text-xs font-semibold">No passes yet</p>
            <p className="text-text-secondary mt-1 text-[11px]">
              Adjust the window or sensor and the results refresh on their own.
            </p>
          </div>
        )}

        {result &&
          PROG_TYPE_ORDER.map((name) => {
            const meta = PROG_TYPE_META[name];
            const isOpen = openSections.has(name);

            const entries = searchedMissions.map((mission) => {
              const record = progTypeFor(mission, name);
              const supported = missionSupportsProgType(mission, name);
              return {
                mission,
                record,
                segments: supported && record?.available ? record.segments ?? [] : [],
              };
            });

            if (!entries.length) return null;

            const passCount = entries.reduce((total, entry) => total + entry.segments.length, 0);
            const twoColumns = entries.length > 1;

            return (
              <section key={name} className="border-border overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleSection(name)}
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
                      className={`text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className={`grid grid-cols-1 bg-white ${twoColumns ? "sm:grid-cols-2" : ""}`}>
                    {(twoColumns ? [0, 1] : [0]).map((column) => {
                      const columnEntries = twoColumns
                        ? entries.filter((_, index) => index % 2 === column)
                        : entries;

                      if (!columnEntries.length) return <div key={column} />;

                      return (
                        <div
                          key={column}
                          className={`divide-border divide-y ${column === 1 ? "border-border border-t sm:border-t-0 sm:border-l" : ""
                            }`}
                        >
                          {columnEntries.map(({ mission, record, segments }) => (
                            <div key={mission} className="space-y-2 p-4">
                              {segments.length ? (
                                <>
                                  <h4 className="text-[13px] font-bold tracking-wide text-slate-900">
                                    {mission}
                                  </h4>
                                  {segments.map((segment) => (
                                    <SegmentRow
                                      key={segment.segmentKey}
                                      segment={segment}
                                      selected={
                                        selection?.segment.segmentKey === segment.segmentKey
                                      }
                                      onSelect={() =>
                                        setSelection({
                                          segment,
                                          mission,
                                          progType: name,
                                          orderEndpoint: orderEndpointFor(mission, name),
                                        })
                                      }
                                    />
                                  ))}
                                </>
                              ) : (
                                <MissionUnavailable
                                  mission={mission}
                                  progType={name}
                                  record={record}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
      </div>

      {/* Selection footer */}
      {selection && (
        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-t bg-white px-4 py-2.5">
          <span className="text-text-secondary min-w-0 truncate text-[11px]">
            {selection.mission} · {PROG_TYPE_META[selection.progType].title} ·{" "}
            {formatDay(selection.segment.acquisitionStartDate)}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-text-muted hover:text-primary text-[11px]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onContinue?.(selection)}
              disabled={!selection.orderEndpoint}
              title={
                selection.orderEndpoint
                  ? undefined
                  : "No order endpoint is published for this mission and programme yet."
              }
              className="bg-primary hover:bg-primary/90 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              Get price
            </button>
          </div>
        </div>
      )}
    </div>
  );
};