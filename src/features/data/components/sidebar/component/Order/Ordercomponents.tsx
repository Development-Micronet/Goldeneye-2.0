import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import {
    ORDER_FILTERS,
    formatArea,
    formatDateTime,
    isActive,
    isCancelled,
    statusLabel,
} from "../../api/Order.service";
import type { OrderFilter, Tasking } from "../../api/Order.service";

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

const badgeTone = (status?: string) => {
    if (isCancelled(status)) return "bg-red-50 text-red-700";
    if (isActive(status)) return "bg-primary/10 text-primary";
    return "bg-slate-100 text-slate-600";
};

export const OrderStatusBadge: React.FC<{ status?: string }> = ({ status }) => (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(status)}`}>
        {statusLabel(status)}
    </span>
);

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

interface OrderFiltersProps {
    value: OrderFilter;
    counts: Record<OrderFilter, number>;
    onChange: (filter: OrderFilter) => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({ value, counts, onChange }) => (
    <div className="flex items-center gap-1.5">
        {ORDER_FILTERS.map((filter) => (
            <button
                key={filter.value}
                type="button"
                onClick={() => onChange(filter.value)}
                aria-pressed={filter.value === value}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter.value === value
                    ? "bg-primary text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
            >
                {filter.label} ({counts[filter.value]})
            </button>
        ))}
    </div>
);

/* ------------------------------------------------------------------ */
/* Order card                                                          */
/* ------------------------------------------------------------------ */

/** Skips itself when there is nothing to show, so blanks never render. */
const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    if (value === null || value === undefined || value === "" || value === "—") return null;

    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-right text-[11px] font-medium break-all text-gray-900">{value}</span>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-2.5 space-y-1 border-t border-gray-100 pt-2.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase">{title}</p>
        {children}
    </div>
);

/** Centre of the AOI's outer ring, for a quick idea of where it sits. */
const aoiCentre = (coordinates?: number[][][]) => {
    const ring = coordinates?.[0];
    if (!ring?.length) return undefined;

    const points = ring.slice(0, -1).length ? ring.slice(0, -1) : ring;
    const lon = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const lat = points.reduce((sum, [, y]) => sum + y, 0) / points.length;

    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};

interface OrderCardProps {
    tasking: Tasking;
    onCancel: (tasking: Tasking) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ tasking, onCancel }) => {
    const progress = tasking.tasking_progress;
    const period = tasking.period;

    // The list endpoint omits these, so only show one when it arrives.
    const reference = tasking.customerRef ?? tasking.aoiName ?? tasking.comment;

    // Airbus sometimes reports a different status from ours; show it when it differs.
    const airbusStatus =
        tasking.airbus_status && statusLabel(tasking.airbus_status) !== statusLabel(tasking.status)
            ? statusLabel(tasking.airbus_status)
            : undefined;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-primary truncate text-sm font-semibold">{tasking.tasking_id}</h3>
                    {reference && <p className="truncate text-[11px] text-gray-500">{reference}</p>}
                </div>
                <OrderStatusBadge status={tasking.status} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-600">
                {tasking.mission && <span>{tasking.mission}</span>}
                {tasking.prog_type_name && <span>{tasking.prog_type_name}</span>}
                {tasking.acquisition_mode && <span>{tasking.acquisition_mode}</span>}
            </div>

            <Section title="Order">
                <Row label="SAL" value={tasking.sal} />
                <Row label="SO" value={tasking.so} />
                <Row label="Airbus status" value={airbusStatus} />
                <Row label="Ordered by" value={tasking.order_creator ?? tasking.username} />
                <Row label="Placed" value={formatDateTime(tasking.creation_date)} />
                <Row label="Cost" value={tasking.cost ? Number(tasking.cost).toFixed(2) : undefined} />
            </Section>

            <Section title="Parameters">
                <Row
                    label="Max incidence angle"
                    value={tasking.max_incidence_angle != null ? `${tasking.max_incidence_angle}°` : undefined}
                />
                <Row
                    label="Max cloud cover"
                    value={tasking.max_cloud_cover != null ? `${tasking.max_cloud_cover}%` : undefined}
                />
                <Row label="AOI centre" value={aoiCentre(tasking.aoi?.coordinates)} />
            </Section>

            {(period?.startDate || period?.endDate) && (
                <Section title="Acquisition window">
                    <Row label="Start" value={formatDateTime(period?.startDate)} />
                    <Row label="End" value={formatDateTime(period?.endDate)} />
                </Section>
            )}

            {progress && (
                <Section title="Progress">
                    <Row label="Ordered area" value={formatArea(progress.orderedArea)} />
                    <Row label="Validated area" value={formatArea(progress.validatedArea)} />
                    <Row label="Segments" value={tasking.segments?.length ?? 0} />
                </Section>
            )}

            {(tasking.contract_id || tasking.workspace_id || tasking.comment) && (
                <Section title="Contract">
                    <Row label="Contract" value={tasking.contract_id} />
                    <Row label="Workspace" value={tasking.workspace_id} />
                    <Row label="Comment" value={tasking.comment} />
                </Section>
            )}

            {isActive(tasking.status) && (
                <button
                    type="button"
                    onClick={() => onCancel(tasking)}
                    className="mt-3 w-full rounded-md border border-red-200 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                >
                    Cancel Order
                </button>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Cancel dialog                                                       */
/* ------------------------------------------------------------------ */

interface CancelOrderDialogProps {
    tasking: Tasking;
    isCancelling: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
    tasking,
    isCancelling,
    onConfirm,
    onClose,
}) => (
    <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
        <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertTriangle size={16} className="text-red-600" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">Cancel order?</h3>
                    <p className="mt-1 text-xs text-gray-500">
                        Are you sure you want to cancel order{" "}
                        <span className="font-semibold text-gray-900">{tasking.tasking_id}</span>? This can't be
                        undone.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isCancelling}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Keep order
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isCancelling}
                    className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isCancelling && <Loader2 size={13} className="animate-spin" />}
                    Confirm cancellation
                </button>
            </div>
        </div>
    </div>
);