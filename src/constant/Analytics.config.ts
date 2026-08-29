import type { ElementType } from "react";
import { Plane, Ship, TreeDeciduous } from "lucide-react";
import {
  detectAircraft,
  detectShip,
  detectTree,
  type UploadProgressHandler,
} from "../features/data/components/sidebar/api/Analytics.service";
import type { DetectionType } from "../features/data/hooks/useRasterStore";

/* ------------------------------------------------------------------ *
 * Services
 * ------------------------------------------------------------------ *
 * Only the three endpoints that exist are listed. To add another
 * service: write the request function in Analytics.service.ts, widen
 * RasterOperationType in the store, then add an entry here. Nothing
 * else in the UI needs touching.
 * ------------------------------------------------------------------ */

export interface ServiceConfig {
  servicename: DetectionType;
  label: string;
  description: string;
  icon: ElementType;
  /** Rough server-side runtime, used only to estimate remaining time */
  baselineMs: number;
  run: (file: File, onUploadProgress?: UploadProgressHandler) => Promise<any>;
}

export const SERVICES: ServiceConfig[] = [
  {
    servicename: "aircraft",
    label: "Aircraft detection",
    description: "Fixed-wing and rotary airframes on apron, taxiway and runway",
    icon: Plane,
    baselineMs: 20_000,
    run: detectAircraft,
  },
  {
    servicename: "ship",
    label: "Ship detection",
    description: "Vessels at berth and underway across coastal water",
    icon: Ship,
    baselineMs: 22_000,
    run: detectShip,
  },
  {
    servicename: "tree",
    label: "Tree detection",
    description: "Individual crown delineation across dense canopy",
    icon: TreeDeciduous,
    baselineMs: 38_000,
    run: detectTree,
  },
];

export const SERVICE_BY_NAME = new Map(SERVICES.map((service) => [service.servicename, service]));

export const serviceLabel = (name: DetectionType) => SERVICE_BY_NAME.get(name)?.label ?? name;

/* ------------------------------------------------------------------ *
 * Prediction stages
 * ------------------------------------------------------------------ */

export type PredictionStatus =
  "queued" | "uploading" | "processing" | "finalizing" | "completed" | "failed";

export const STAGE_LABEL: Record<PredictionStatus, string> = {
  queued: "Queued",
  uploading: "Uploading raster",
  processing: "Processing model",
  finalizing: "Generating result",
  completed: "Completed",
  failed: "Failed",
};

export const isActive = (status: PredictionStatus) =>
  status === "queued" ||
  status === "uploading" ||
  status === "processing" ||
  status === "finalizing";

/** Card / pill / bar colours per status. Tailwind's built-in palettes,
 *  so this works without adding tokens to @theme. */
export const STATUS_STYLE: Record<
  PredictionStatus,
  { card: string; pill: string; bar: string; spine: string }
> = {
  queued: {
    card: "border-border bg-white",
    pill: "bg-gray-100 text-text-secondary",
    bar: "bg-nav-inactive",
    spine: "bg-border",
  },
  uploading: {
    card: "border-primary/40 bg-primary-100",
    pill: "bg-primary text-white",
    bar: "bg-primary",
    spine: "bg-primary",
  },
  processing: {
    card: "border-primary/40 bg-primary-100",
    pill: "bg-primary text-white",
    bar: "bg-primary",
    spine: "bg-primary",
  },
  finalizing: {
    card: "border-primary/40 bg-primary-100",
    pill: "bg-primary text-white",
    bar: "bg-primary",
    spine: "bg-primary",
  },
  completed: {
    card: "border-emerald-500/60 bg-emerald-50",
    pill: "bg-emerald-600 text-white",
    bar: "bg-emerald-600",
    spine: "bg-emerald-600",
  },
  failed: {
    card: "border-red-400 bg-red-50",
    pill: "bg-red-600 text-white",
    bar: "bg-red-500",
    spine: "bg-red-500",
  },
};

/* ------------------------------------------------------------------ *
 * Formatters
 * ------------------------------------------------------------------ */

export const formatDuration = (ms?: number) => {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

export const formatEta = (remainingMs: number) => {
  if (remainingMs <= 0) return "Finishing up";
  if (remainingMs < 60_000) return `~${Math.ceil(remainingMs / 1000)}s left`;

  return `~${Math.ceil(remainingMs / 60_000)} min left`;
};

export const formatClock = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const readCount = (data: unknown): number => {
  const payload = (data ?? {}) as {
    plane_count?: number;
    tree_count?: number;
    ship_count?: number;
  };

  return payload.plane_count ?? payload.tree_count ?? payload.ship_count ?? 0;
};
