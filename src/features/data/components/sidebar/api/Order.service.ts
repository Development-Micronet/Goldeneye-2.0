import { apiClient } from "../../../../../api/apiClient";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Only the identifier and status are guaranteed; the rest vary by response. */
export interface Tasking {
    id: number;
    tasking_id: string;
    status: string;
    airbus_status?: string;
    mission?: string;
    prog_type_name?: string;
    acquisition_mode?: string;
    comment?: string;
    customerRef?: string;
    aoiName?: string;
    creation_date?: string;
    period?: { startDate?: string; endDate?: string };
    tasking_progress?: { orderedArea?: number; validatedArea?: number };
    aoi?: { type: string; coordinates: number[][][] };
}

export interface CancelTaskingResponse {
    success: boolean;
    tasking_id: string;
    status: string;
    airbus_status?: string;
    airbus_canceled?: boolean;
    message?: string;
}

export type OrderFilter = "all" | "in-progress" | "cancelled";

export const ORDER_FILTERS: Array<{ value: OrderFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "in-progress", label: "In Progress" },
    { value: "cancelled", label: "Cancelled" },
];

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/** CANCELED, Cancelled and in_progress all have to compare equal. */
const normalise = (status?: string) => (status ?? "").toUpperCase().replace(/[^A-Z]/g, "");

const FINISHED = ["COMPLETED", "DELIVERED", "REJECTED", "FAILED", "EXPIRED"];

export const isCancelled = (status?: string) => normalise(status).startsWith("CANCEL");

/** Only active orders can be cancelled. */
export const isActive = (status?: string) =>
    !isCancelled(status) && !FINISHED.includes(normalise(status));

const STATUS_LABELS: Record<string, string> = {
    INPROGRESS: "In Progress",
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    COMPLETED: "Completed",
    DELIVERED: "Delivered",
    CANCELED: "Cancelled",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
    FAILED: "Failed",
    EXPIRED: "Expired",
};

/** Unknown statuses still render, just title-cased. */
export const statusLabel = (status?: string) => {
    if (!status) return "Unknown";

    return (
        STATUS_LABELS[normalise(status)] ??
        status
            .replace(/[_-]+/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
};

export const matchesFilter = (status: string | undefined, filter: OrderFilter) => {
    if (filter === "all") return true;
    if (filter === "cancelled") return isCancelled(status);
    return isActive(status);
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
});

/** "03 Oct 2026", or a dash when the date is missing or unparseable. */
export const formatDate = (iso?: string) => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : "—";
};

/** "03 Oct 2026, 10:11 AM" */
export const formatDateTime = (iso?: string) => {
    const date = iso ? new Date(iso) : null;
    if (!date || Number.isNaN(date.getTime())) return "—";

    return `${dateFormat.format(date)}, ${timeFormat.format(date).toUpperCase()}`;
};

/** 753461989.36 → "753.46M m²" */
export const formatArea = (squareMetres?: number) => {
    if (squareMetres == null || Number.isNaN(squareMetres)) return "—";

    const compact = new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 2,
    }).format(squareMetres);

    return `${compact} m²`;
};

/** Pulls the useful line out of a DRF error body. */
export const errorMessage = (error: unknown): string | null => {
    const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
    if (!data) return null;

    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;

    const errors = (data.errors ?? data) as Record<string, unknown>;

    for (const value of Object.values(errors)) {
        if (typeof value === "string") return value;
        if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }

    return null;
};

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Responses arrive as an AES-GCM envelope keyed on the access token. */
const unwrap = async <T,>(body: unknown, token: string): Promise<T> => {
    const envelope = typeof body === "string" ? body : (body as { data?: unknown })?.data;

    if (typeof envelope === "string") {
        return (await decryptAESGCM(envelope, token)) as T;
    }

    return body as T;
};

/** The trailing slash avoids Django's APPEND_SLASH redirect. */
export const getTaskings = async (token: string): Promise<Tasking[]> => {
    const res = await apiClient.get("/tasking/");
    const data = await unwrap<{ taskings?: Tasking[] }>(res.data, token);
    return data?.taskings ?? [];
};

export const cancelTasking = async (
    taskingId: string,
    token: string
): Promise<CancelTaskingResponse> => {
    const res = await apiClient.post(`/tasking/${taskingId}/cancel/`);
    return unwrap<CancelTaskingResponse>(res.data, token);
};