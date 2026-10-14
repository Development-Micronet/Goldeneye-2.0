import { useMemo } from "react";
import { toast } from "react-toastify";
import { create } from "zustand";

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
import { queryClient } from "../providers/QueryProvider";

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

const UPLOAD_CEILING = 40;
const PROCESSING_CEILING = 88;
const UPLOAD_FALLBACK_MS = 1_500;

let tickerInterval: ReturnType<typeof setInterval> | null = null;
const fallbackTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const abortControllers: Record<string, AbortController> = {};

interface PredictionStoreState {
  predictions: PredictionOperation[];
  activeCount: number;
  patch: (id: string, data: Partial<PredictionOperation>) => void;
  beginProcessing: (id: string) => void;
  run: (layer: RasterLayer, services: DetectionType[]) => Promise<void>;
  abort: (id: string) => void;
  dismiss: (id: string) => void;
  clearHistory: () => void;
}

function checkAndManageTicker(
  get: () => PredictionStoreState,
  set: (fn: (state: PredictionStoreState) => Partial<PredictionStoreState>) => void,
) {
  const { predictions } = get();
  const hasProcessing = predictions.some((item) => item.status === "processing");

  if (hasProcessing && !tickerInterval) {
    tickerInterval = setInterval(() => {
      const current = get().predictions;
      const stillProcessing = current.some((item) => item.status === "processing");

      if (!stillProcessing) {
        if (tickerInterval) {
          clearInterval(tickerInterval);
          tickerInterval = null;
        }
        return;
      }

      set((state) => {
        const updated = state.predictions.map((item) => {
          if (item.status !== "processing") return item;

          const baseline = SERVICE_BY_NAME.get(item.serviceName)?.baselineMs ?? 25_000;
          const elapsed = Date.now() - (item.processingStartedAt ?? item.startedAt);

          const eased = 1 - Math.exp(-elapsed / (baseline * 0.55));

          return {
            ...item,
            progress: Math.min(
              PROCESSING_CEILING,
              UPLOAD_CEILING + eased * (PROCESSING_CEILING - UPLOAD_CEILING),
            ),
            remainingMs: Math.max(0, baseline - elapsed),
          };
        });

        return {
          predictions: updated,
          activeCount: updated.filter((item) => isActive(item.status)).length,
        };
      });
    }, 300);
  } else if (!hasProcessing && tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
}

export const useDataPredictionStore = create<PredictionStoreState>((set, get) => ({
  predictions: [],
  activeCount: 0,

  patch: (id: string, data: Partial<PredictionOperation>) => {
    set((state) => {
      const updated = state.predictions.map((item) =>
        item.id === id ? { ...item, ...data } : item,
      );
      return {
        predictions: updated,
        activeCount: updated.filter((item) => isActive(item.status)).length,
      };
    });
    checkAndManageTicker(get, set);
  },

  beginProcessing: (id: string) => {
    if (fallbackTimers[id]) {
      clearTimeout(fallbackTimers[id]);
      delete fallbackTimers[id];
    }

    set((state) => {
      const updated = state.predictions.map((item) =>
        item.id === id && (item.status === "uploading" || item.status === "queued")
          ? {
              ...item,
              status: "processing" as PredictionStatus,
              processingStartedAt: Date.now(),
              progress: Math.max(item.progress, UPLOAD_CEILING),
            }
          : item,
      );
      return {
        predictions: updated,
        activeCount: updated.filter((item) => isActive(item.status)).length,
      };
    });

    checkAndManageTicker(get, set);
  },

  run: async (layer: RasterLayer, services: DetectionType[]) => {
    if (services.length === 0) return;

    const batch: PredictionOperation[] = services.map((name) => ({
      id: crypto.randomUUID(),
      serviceName: name,
      layerId: layer.id,
      layerName: layer.name,
      status: "queued" as PredictionStatus,
      progress: 0,
      startedAt: Date.now(),
    }));

    set((state) => {
      const updated = [...batch, ...state.predictions];
      return {
        predictions: updated,
        activeCount: updated.filter((item) => isActive(item.status)).length,
      };
    });

    toast.info(
      services.length === 1
        ? `${serviceLabel(services[0])} started on ${layer.name}`
        : `${services.length} predictions started on ${layer.name}`,
    );

    const { patch, beginProcessing } = get();

    const settled = await Promise.allSettled(
      batch.map(async (job) => {
        const service = SERVICE_BY_NAME.get(job.serviceName)!;
        const controller = new AbortController();
        abortControllers[job.id] = controller;

        patch(job.id, { status: "uploading", progress: 2 });

        fallbackTimers[job.id] = setTimeout(
          () => beginProcessing(job.id),
          UPLOAD_FALLBACK_MS,
        );

        try {
          const data = await service.run(
            layer.file,
            (fraction: number) => {
              if (fraction >= 1) {
                beginProcessing(job.id);
                return;
              }

              set((state) => ({
                predictions: state.predictions.map((item) =>
                  item.id === job.id && item.status === "uploading"
                    ? {
                        ...item,
                        progress: Math.max(
                          item.progress,
                          Math.round(fraction * UPLOAD_CEILING),
                        ),
                      }
                    : item,
                ),
              }));
            },
            controller.signal,
          );

          patch(job.id, { status: "finalizing", progress: 94 });

          const resultId = crypto.randomUUID();
          const count = readCount(data);
          const finishedAt = Date.now();

          useRasterStore.getState().addOperation(layer.id, {
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

          queryClient.invalidateQueries({
            queryKey: ["company-images"],
          });

          return job.serviceName;
        } catch (error: any) {
          if (fallbackTimers[job.id]) {
            clearTimeout(fallbackTimers[job.id]);
            delete fallbackTimers[job.id];
          }

          const wasAborted =
            controller.signal.aborted ||
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED" ||
            error?.message?.toLowerCase().includes("canceled") ||
            error?.message?.toLowerCase().includes("aborted");

          if (wasAborted) {
            const current = get().predictions.find((p) => p.id === job.id);
            if (current && current.status !== "aborted") {
              patch(job.id, {
                status: "aborted",
                progress: 0,
                finishedAt: Date.now(),
                remainingMs: undefined,
                error: "Aborted by user",
              });
              toast.info(`${serviceLabel(job.serviceName)} aborted`);
            }
            return;
          }

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
        } finally {
          delete abortControllers[job.id];
        }
      }),
    );

    const failed = settled.filter((item) => item.status === "rejected").length;

    if (failed && settled.length > 1) {
      toast.warning(`${settled.length - failed} of ${settled.length} predictions completed`);
    }
  },

  abort: (id: string) => {
    if (abortControllers[id]) {
      try {
        abortControllers[id].abort();
      } catch (e) {
        console.warn("[analytics] error aborting controller", e);
      }
      delete abortControllers[id];
    }

    if (fallbackTimers[id]) {
      clearTimeout(fallbackTimers[id]);
      delete fallbackTimers[id];
    }

    const { predictions } = get();
    const pred = predictions.find((p) => p.id === id);

    set((state) => {
      const updated = state.predictions.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "aborted" as PredictionStatus,
              progress: 0,
              finishedAt: Date.now(),
              remainingMs: undefined,
              error: "Aborted by user",
            }
          : item,
      );
      return {
        predictions: updated,
        activeCount: updated.filter((item) => isActive(item.status)).length,
      };
    });

    if (pred) {
      toast.info(`${serviceLabel(pred.serviceName)} aborted`);
    }

    checkAndManageTicker(get, set);
  },

  dismiss: (id: string) => {
    if (abortControllers[id]) {
      try {
        abortControllers[id].abort();
      } catch (e) {
        console.warn("[analytics] error aborting controller", e);
      }
      delete abortControllers[id];
    }
    if (fallbackTimers[id]) {
      clearTimeout(fallbackTimers[id]);
      delete fallbackTimers[id];
    }
    set((state) => {
      const updated = state.predictions.filter((item) => item.id !== id);
      return {
        predictions: updated,
        activeCount: updated.filter((item) => isActive(item.status)).length,
      };
    });
    checkAndManageTicker(get, set);
  },

  clearHistory: () => {
    set((state) => {
      const updated = state.predictions.filter((item) => isActive(item.status));
      return {
        predictions: updated,
        activeCount: updated.length,
      };
    });
  },
}));

export function usePredictions() {
  const predictions = useDataPredictionStore((state) => state.predictions);
  const activeCount = useDataPredictionStore((state) => state.activeCount);
  const run = useDataPredictionStore((state) => state.run);
  const abort = useDataPredictionStore((state) => state.abort);
  const dismiss = useDataPredictionStore((state) => state.dismiss);
  const clearHistory = useDataPredictionStore((state) => state.clearHistory);

  const activePredictions = useMemo(
    () => predictions.filter((item) => isActive(item.status)),
    [predictions],
  );

  return {
    predictions,
    activePredictions,
    activeCount,
    run,
    abort,
    dismiss,
    clearHistory,
  };
}
