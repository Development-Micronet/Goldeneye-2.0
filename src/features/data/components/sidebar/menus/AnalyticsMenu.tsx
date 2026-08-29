import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Activity, ChevronDown, Loader2, RotateCcw, ScanSearch } from "lucide-react";

import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import { useRasterStore, type DetectionType } from "../../../hooks/useRasterStore";
import { usePredictions, type PredictionOperation } from "../../../../../utils/Usepredictions";
import {
  formatClock,
  formatDuration,
  isActive,
  serviceLabel,
  SERVICES,
  STAGE_LABEL,
  STATUS_STYLE,
} from "../../../../../constant/Analytics.config";
import { LayerSelect } from "../component/Analytics/Layerselect";
import { ServiceCard } from "../component/Analytics/Servicecard";
import { ResultCard } from "../component/Analytics/Resultcard";

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="font-mona text-text-secondary text-[10px] font-semibold tracking-[0.08em] uppercase">
      {label}
    </p>
    <p
      className="text-text-muted mt-0.5 truncate text-[13px] font-medium tabular-nums"
      title={String(value)}
    >
      {value}
    </p>
  </div>
);

export const AnalyticsMenu: React.FC = () => {
  const rasters = useRasterStore((state) => state.rasters);
  const fitRasterId = useRasterStore((state) => state.fitRasterId);
  const rasterStatus = useRasterStore((state) => state.rasterStatus);
  const setFitRasterId = useRasterStore((state) => state.setFitRasterId);
  const showOperation = useRasterStore((state) => state.showOperation);
  const resetDisplayImage = useRasterStore((state) => state.resetDisplayImage);
  const renameOperation = useRasterStore((state) => state.renameOperation);
  const removeOperation = useRasterStore((state) => state.removeOperation);
  const requestZoom = useRasterStore((state) => state.requestZoom);

  const { predictions, activeCount, run, clearHistory } = usePredictions();

  const [selectedServices, setSelectedServices] = useState<DetectionType[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedRaster =
    rasters.find((raster) => raster.id === fitRasterId) ?? rasters[rasters.length - 1];

  /** most recent prediction per service, scoped to the active layer */
  const latestByService = useMemo(() => {
    const map = new Map<DetectionType, PredictionOperation>();

    predictions.forEach((prediction) => {
      if (prediction.layerId !== selectedRaster?.id) return;

      const existing = map.get(prediction.serviceName);

      if (!existing || prediction.startedAt > existing.startedAt) {
        map.set(prediction.serviceName, prediction);
      }
    });

    return map;
  }, [predictions, selectedRaster?.id]);

  const results = useMemo(
    () => [...(selectedRaster?.operations ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [selectedRaster?.operations],
  );

  const history = useMemo(
    () => predictions.filter((prediction) => !isActive(prediction.status)),
    [predictions],
  );

  const busy = activeCount > 0;
  const showingOriginal = !selectedRaster?.displayOperationId;
  const layersLoading = rasterStatus === "reading" || rasterStatus === "rendering";

  const toggleService = (name: DetectionType) =>
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );

  const runSelected = async () => {
    if (!selectedRaster) {
      toast.warning("Select a raster layer first");
      return;
    }

    await run(selectedRaster, selectedServices);
    setSelectedServices([]);
  };

  /* ---------------- loading skeleton ---------------- */

  if (rasters.length === 0 && layersLoading) {
    return (
      <div className="h-full space-y-3 p-3">
        <div className="bg-border/70 h-14 w-full animate-pulse rounded-lg" />
        <div className="bg-border/50 h-24 w-full animate-pulse rounded-xl" />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div key={service.servicename} className="bg-border/40 h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- empty state ---------------- */

  if (rasters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <div className="border-primary/30 bg-primary-100 flex w-full max-w-sm flex-col items-center rounded-2xl border border-dashed p-8 text-center">
          <div className="bg-primary/10 text-primary mb-5 flex h-16 w-16 items-center justify-center rounded-full">
            <AoiDrawIcon className="h-8 w-8" />
          </div>

          <h3 className="font-mona text-primary mb-2 text-base font-semibold">No raster loaded</h3>

          <p className="text-text-muted max-w-xs text-sm">
            Draw an AOI, then upload raster data to run detection services on it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter h-full space-y-4 overflow-y-auto p-3">
      {/* ---------------- layer selection + metadata ---------------- */}
      <section className="border-primary/25 rounded-xl border bg-white p-3 shadow-[0_1px_10px_-6px_rgba(44,102,113,0.5)]">
        <LayerSelect
          layers={rasters}
          selectedId={selectedRaster?.id}
          onSelect={(id) => {
            setFitRasterId(id);

            const layer = rasters.find((raster) => raster.id === id);

            if (layer) toast.info(`${layer.name} selected`);
          }}
          loading={layersLoading}
        />

        <div className="border-border mt-3 grid grid-cols-3 gap-x-3 gap-y-3 border-t pt-3 lg:grid-cols-4">
          <Field label="Type" value={selectedRaster?.type.toUpperCase() ?? "—"} />
          <Field label="Projection" value={selectedRaster?.projection ?? "—"} />
          <Field
            label="Resolution"
            value={selectedRaster?.resolution ? `${selectedRaster.resolution} m` : "—"}
          />
          <Field
            label="Size"
            value={
              selectedRaster?.width && selectedRaster?.height
                ? `${selectedRaster.width} × ${selectedRaster.height}`
                : "—"
            }
          />
          <Field
            label="Captured"
            value={
              selectedRaster?.capturedAt
                ? new Date(selectedRaster.capturedAt).toLocaleDateString()
                : "—"
            }
          />
          <Field label="Opacity" value={`${Math.round((selectedRaster?.opacity ?? 1) * 100)}%`} />
          <Field label="Visibility" value={selectedRaster?.visible ? "Visible" : "Hidden"} />
          <Field label="Results" value={selectedRaster?.operations.length ?? 0} />
        </div>

        <div className="bg-primary-100 mt-3 rounded-lg p-2">
          <p className="font-mona text-primary text-[10px] font-semibold tracking-[0.08em] uppercase">
            Extent
          </p>
          <p className="font-mona text-text-muted mt-0.5 text-[11px] break-all tabular-nums">
            {selectedRaster?.aoi?.join(", ") ?? "—"}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`font-mona rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
              showingOriginal
                ? "bg-primary-100 text-primary ring-primary/25 ring-1"
                : "bg-primary text-white"
            }`}
          >
            {showingOriginal
              ? "Showing original"
              : `Showing ${selectedRaster?.displayType} overlay`}
          </span>

          <button
            type="button"
            onClick={() => {
              if (!selectedRaster) return;

              resetDisplayImage(selectedRaster.id);
              toast.info("Showing the original raster");
            }}
            disabled={showingOriginal}
            className="border-border font-mona text-text-muted hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw size={12} />
            Restore original raster
          </button>
        </div>
      </section>

      {/* ---------------- services ---------------- */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="font-mona text-text-muted text-xs font-bold tracking-[0.1em] uppercase">
            Prediction services
          </h3>

          <span className="font-mona text-text-secondary flex items-center gap-2 text-[10px] tabular-nums">
            {busy && (
              <span className="bg-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-white">
                <Activity size={10} />
                {activeCount} running
              </span>
            )}
            {selectedServices.length} selected
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.servicename}
              service={service}
              layerName={selectedRaster?.name}
              selected={selectedServices.includes(service.servicename)}
              disabled={!selectedRaster}
              prediction={latestByService.get(service.servicename)}
              onToggle={() => toggleService(service.servicename)}
              onRunOne={() => {
                if (!selectedRaster) {
                  toast.warning("Select a raster layer first");
                  return;
                }

                run(selectedRaster, [service.servicename]);

                setSelectedServices((prev) => prev.filter((item) => item !== service.servicename));
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={runSelected}
          disabled={!selectedRaster || selectedServices.length === 0 || busy}
          className="bg-primary font-mona disabled:bg-nav-inactive mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold tracking-wide text-white transition-all duration-150 hover:brightness-110 active:scale-[0.99] sm:w-auto"
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Running {activeCount} prediction{activeCount === 1 ? "" : "s"}…
            </>
          ) : (
            <>
              <ScanSearch size={15} />
              {selectedServices.length > 1
                ? `Run ${selectedServices.length} predictions`
                : "Run prediction"}
            </>
          )}
        </button>
      </section>

      {/* ---------------- results ---------------- */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-mona text-text-muted text-xs font-bold tracking-[0.1em] uppercase">
            Results
          </h3>

          <span className="font-mona text-text-secondary text-[10px] tabular-nums">
            {results.length} on this layer
          </span>
        </div>

        {results.length === 0 ? (
          <div className="border-border rounded-lg border border-dashed p-5 text-center">
            <p className="text-text-muted text-[13px]">
              {busy
                ? "Predictions are running. Results appear here as each one finishes."
                : "Nothing detected yet. Pick one or more services above and run them on this layer."}
            </p>
          </div>
        ) : (
          results.map((operation) => (
            <ResultCard
              key={operation.id}
              operation={operation}
              layerName={selectedRaster?.name}
              isOnMap={selectedRaster?.displayOperationId === operation.id}
              onShow={() => showOperation(selectedRaster!.id, operation.id)}
              onZoom={() => {
                showOperation(selectedRaster!.id, operation.id);
                requestZoom(selectedRaster!.id);
              }}
              onRename={(fileName) => renameOperation(selectedRaster!.id, operation.id, fileName)}
              onDelete={() => {
                removeOperation(selectedRaster!.id, operation.id);
                toast.info(`${operation.type} result deleted`);
              }}
            />
          ))
        )}
      </section>

      {/* ---------------- run history ---------------- */}
      {history.length > 0 && (
        <section className="border-border rounded-xl border bg-white">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
          >
            <span className="font-mona text-text-muted text-xs font-bold tracking-[0.1em] uppercase">
              Run history
            </span>

            <span className="flex items-center gap-2">
              <span className="font-mona text-text-secondary text-[10px] tabular-nums">
                {history.length}
              </span>

              <ChevronDown
                size={14}
                className={`text-text-secondary transition-transform duration-200 ${
                  historyOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {historyOpen && (
            <div className="border-border border-t p-2">
              <ul className="space-y-1">
                {history.map((prediction) => (
                  <li
                    key={prediction.id}
                    className="hover:bg-primary-100/60 flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        STATUS_STYLE[prediction.status].bar
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="font-mona text-text-muted block truncate text-[11px] font-semibold">
                        {serviceLabel(prediction.serviceName)} · {prediction.layerName}
                      </span>

                      <span className="font-mona text-text-secondary block truncate text-[10px] tabular-nums">
                        {formatClock(prediction.startedAt)} · {STAGE_LABEL[prediction.status]}
                        {prediction.status === "completed" &&
                          ` · ${prediction.count} found · ${formatDuration(
                            (prediction.finishedAt ?? 0) - prediction.startedAt,
                          )}`}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const layer = rasters.find((raster) => raster.id === prediction.layerId);

                        if (!layer) {
                          toast.error("That layer is no longer loaded");
                          return;
                        }

                        run(layer, [prediction.serviceName]);
                      }}
                      className="border-border font-mona text-text-muted hover:border-primary hover:text-primary shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold transition-colors duration-150"
                    >
                      Run again
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={clearHistory}
                className="font-mona text-text-secondary hover:text-primary mt-1 w-full rounded-md px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors duration-150"
              >
                Clear history
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
