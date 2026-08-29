import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  useRasterStore,
  type DetectionType,
  type RasterLayer,
} from "../features/data/hooks/useRasterStore";
import {
  isActive,
  readCount,
  SERVICE_BY_NAME,
  serviceLabel,
  type PredictionStatus,
} from "../constant/Analytics.config";

export interface PredictionOperation {
  id: string;
  serviceName: DetectionType;
  layerId: string;
  layerName: string;

  status: PredictionStatus;

  /** 0–100 */
  progress: number;

  startedAt: number;
  processingStartedAt?: number;
  finishedAt?: number;

  /** ms until the estimate expects a response; only while processing */
  remainingMs?: number;

  count?: number;
  fileName?: string;
  /** id of the RasterOperation this run produced */
  resultId?: string;
  error?: string;
}

/* Progress is split so the honest part is visible:
 * 0–40   real upload bytes
 * 40–88  time-based estimate against the service baseline
 * 88–100 response received, writing to the store  */
const UPLOAD_CEILING = 40;
const PROCESSING_CEILING = 88;

/** If the transport never reports upload bytes, don't sit at 2% forever. */
const UPLOAD_FALLBACK_MS = 1_500;

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionOperation[]>([]);
  const addOperation = useRasterStore((state) => state.addOperation);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const patch = useCallback(
    (id: string, data: Partial<PredictionOperation>) =>
      setPredictions((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item))),
    [],
  );

  const activePredictions = useMemo(
    () => predictions.filter((item) => isActive(item.status)),
    [predictions],
  );

  const hasProcessing = predictions.some((item) => item.status === "processing");

  /* --- estimate ticker ------------------------------------------- */

  useEffect(() => {
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      setPredictions((prev) =>
        prev.map((item) => {
          if (item.status !== "processing") return item;

          const baseline = SERVICE_BY_NAME.get(item.serviceName)?.baselineMs ?? 25_000;

          const elapsed = Date.now() - (item.processingStartedAt ?? item.startedAt);

          // asymptotic: approaches the ceiling but never claims to reach it
          const eased = 1 - Math.exp(-elapsed / (baseline * 0.55));

          return {
            ...item,
            progress: Math.min(
              PROCESSING_CEILING,
              UPLOAD_CEILING + eased * (PROCESSING_CEILING - UPLOAD_CEILING),
            ),
            remainingMs: baseline - elapsed,
          };
        }),
      );
    }, 300);

    return () => clearInterval(interval);
  }, [hasProcessing]);

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const beginProcessing = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];

    setPredictions((prev) =>
      prev.map((item) =>
        item.id === id && (item.status === "uploading" || item.status === "queued")
          ? {
              ...item,
              status: "processing",
              processingStartedAt: Date.now(),
              progress: Math.max(item.progress, UPLOAD_CEILING),
            }
          : item,
      ),
    );
  }, []);

  /* --- run ------------------------------------------------------- */

  const run = useCallback(
    async (layer: RasterLayer, services: DetectionType[]) => {
      if (services.length === 0) return;

      const batch: PredictionOperation[] = services.map((name) => ({
        id: crypto.randomUUID(),
        serviceName: name,
        layerId: layer.id,
        layerName: layer.name,
        status: "queued",
        progress: 0,
        startedAt: Date.now(),
      }));

      setPredictions((prev) => [...batch, ...prev]);

      toast.info(
        services.length === 1
          ? `${serviceLabel(services[0])} started on ${layer.name}`
          : `${services.length} predictions started on ${layer.name}`,
      );

      // All services fire together; each commits its result the moment it
      // lands, so the panel fills in rather than waiting on the slowest.
      const settled = await Promise.allSettled(
        batch.map(async (job) => {
          const service = SERVICE_BY_NAME.get(job.serviceName)!;

          patch(job.id, { status: "uploading", progress: 2 });

          timers.current[job.id] = setTimeout(() => beginProcessing(job.id), UPLOAD_FALLBACK_MS);

          try {
            const data = await service.run(layer.file, (fraction) => {
              if (fraction >= 1) {
                beginProcessing(job.id);
                return;
              }

              setPredictions((prev) =>
                prev.map((item) =>
                  item.id === job.id && item.status === "uploading"
                    ? {
                        ...item,
                        progress: Math.max(item.progress, Math.round(fraction * UPLOAD_CEILING)),
                      }
                    : item,
                ),
              );
            });

            patch(job.id, { status: "finalizing", progress: 94 });

            const resultId = crypto.randomUUID();
            const count = readCount(data);
            const finishedAt = Date.now();

            addOperation(layer.id, {
              id: resultId,
              type: job.serviceName,
              imageUrl: data.imageUrl,
              previewUrl: data.previewUrl,
              cogUrl: data.cogUrl,
              cogFileUrl: data.cogFileUrl,
              fileName: data.fileName,
              status: "ok",
              message: data.message,
              count,
              aoiApplied: "aoi_applied" in data ? data.aoi_applied : undefined,
              durationMs: finishedAt - job.startedAt,
              createdAt: finishedAt,
            });

            patch(job.id, {
              status: "completed",
              progress: 100,
              finishedAt,
              remainingMs: undefined,
              count,
              resultId,
              fileName: data.fileName,
            });

            toast.success(
              `${serviceLabel(job.serviceName)} found ${count} object${count === 1 ? "" : "s"}`,
            );

            return job.serviceName;
          } catch (error) {
            clearTimeout(timers.current[job.id]);
            delete timers.current[job.id];

            const message = error instanceof Error ? error.message : "Prediction failed";

            patch(job.id, {
              status: "failed",
              progress: 100,
              finishedAt: Date.now(),
              remainingMs: undefined,
              error: message,
            });

            toast.error(`${serviceLabel(job.serviceName)}: ${message}`);

            throw error;
          }
        }),
      );

      const failed = settled.filter((item) => item.status === "rejected").length;

      if (failed && settled.length > 1) {
        toast.warning(`${settled.length - failed} of ${settled.length} predictions completed`);
      }
    },
    [addOperation, beginProcessing, patch],
  );

  const dismiss = useCallback(
    (id: string) => setPredictions((prev) => prev.filter((item) => item.id !== id)),
    [],
  );

  const clearHistory = useCallback(
    () => setPredictions((prev) => prev.filter((item) => isActive(item.status))),
    [],
  );

  return {
    predictions,
    activePredictions,
    activeCount: activePredictions.length,
    run,
    dismiss,
    clearHistory,
  };
}
