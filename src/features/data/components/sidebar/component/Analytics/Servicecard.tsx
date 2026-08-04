import React from "react";
import { AlertTriangle, Check, FileImage, Loader2, Play } from "lucide-react";
import type { PredictionOperation } from "../../../../../../utils/Usepredictions";
import { formatDuration, formatEta, isActive, STAGE_LABEL, STATUS_STYLE, type ServiceConfig } from "../../../../../../constant/Analytics.config";



interface ServiceCardProps {
    service: ServiceConfig;
    layerName?: string;
    selected: boolean;
    disabled: boolean;
    /** the most recent prediction for this service on the active layer */
    prediction?: PredictionOperation;
    onToggle: () => void;
    onRunOne: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    service,
    layerName,
    selected,
    disabled,
    prediction,
    onToggle,
    onRunOne,
}) => {
    const Icon = service.icon;
    const status = prediction?.status;
    const running = status ? isActive(status) : false;
    const style = status ? STATUS_STYLE[status] : null;

    const shell = style
        ? style.card
        : selected
            ? "border-primary bg-primary-100"
            : "border-border bg-white hover:border-primary/50 hover:shadow-sm";

    const toggle = () => {
        if (disabled || running) return;
        onToggle();
    };

    return (
        <div
            role="checkbox"
            aria-checked={selected}
            aria-label={`Select ${service.label}`}
            tabIndex={disabled || running ? -1 : 0}
            onClick={toggle}
            onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    toggle();
                }
            }}
            className={`
        group relative flex min-h-[74px] cursor-pointer flex-col justify-between
        overflow-hidden rounded-lg border p-2.5 pl-3
        transition-all duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-primary
        ${selected && !style ? "ring-1 ring-primary/40" : ""}
        ${disabled ? "cursor-not-allowed opacity-50" : ""}
        ${running ? "cursor-default" : ""}
        ${shell}
      `}
        >
            <span
                className={`absolute inset-y-0 left-0 w-[3px] transition-colors duration-200 ${style?.spine ??
                    (selected ? "bg-primary" : "bg-border group-hover:bg-primary/40")
                    }`}
            />

            {/* ---- header: icon, name, status, checkbox ---- */}
            <div className="flex items-center gap-2">
                <span
                    className={`
            flex h-7 w-7 shrink-0 items-center justify-center rounded-md
            transition-colors duration-150
            ${status === "completed"
                            ? "bg-emerald-600 text-white"
                            : status === "failed"
                                ? "bg-red-600 text-white"
                                : running || selected
                                    ? "bg-primary text-white"
                                    : "bg-primary-100 text-primary"
                        }
          `}
                >
                    {running ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : status === "completed" ? (
                        <Check size={14} />
                    ) : status === "failed" ? (
                        <AlertTriangle size={14} />
                    ) : (
                        <Icon size={14} />
                    )}
                </span>

                <h4 className="min-w-0 flex-1 truncate font-mona text-[13px] font-bold leading-tight text-primary">
                    {service.label}
                </h4>

                {status ? (
                    <span
                        className={`shrink-0 rounded-full px-1.5 py-px font-mona text-[9px] font-bold uppercase tracking-wider ${style!.pill}`}
                    >
                        {STAGE_LABEL[status]}
                    </span>
                ) : (
                    // explicit selection box — the icon alone read as decoration
                    <span
                        className={`
              flex h-4 w-4 shrink-0 items-center justify-center rounded
              border transition-all duration-150
              ${selected
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-white group-hover:border-primary/60"
                            }
            `}
                    >
                        {selected && <Check size={11} strokeWidth={3} />}
                    </span>
                )}
            </div>

            {/* ---- footer: layer chip + action, or live progress ---- */}
            {running ? (
                <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                        <div
                            className={`h-full rounded-full transition-[width] duration-300 ease-out ${style!.bar}`}
                            style={{ width: `${Math.round(prediction!.progress)}%` }}
                        />
                    </div>

                    <div className="mt-1 flex items-center justify-between font-mona text-[10px] tabular-nums text-text-muted">
                        <span>{Math.round(prediction!.progress)}%</span>
                        <span>
                            {prediction!.status === "processing" &&
                                prediction!.remainingMs !== undefined
                                ? formatEta(prediction!.remainingMs)
                                : STAGE_LABEL[prediction!.status]}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="mt-2 flex items-center justify-between gap-2">
                    {status === "completed" ? (
                        <span className="flex min-w-0 items-baseline gap-1.5 font-mona text-[11px] tabular-nums text-emerald-800">
                            <span className="font-bold">{prediction!.count}</span>
                            <span className="truncate">
                                found in{" "}
                                {formatDuration(
                                    (prediction!.finishedAt ?? 0) - prediction!.startedAt
                                )}
                            </span>
                        </span>
                    ) : status === "failed" ? (
                        <span
                            className="min-w-0 truncate text-[11px] text-red-700"
                            title={prediction!.error}
                        >
                            {prediction!.error}
                        </span>
                    ) : (
                        <span className="flex min-w-0 items-center gap-1 font-mona text-[10px] text-text-secondary">
                            <FileImage size={11} className="shrink-0" />
                            <span className="truncate" title={layerName}>
                                {layerName ?? "No layer selected"}
                            </span>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRunOne();
                        }}
                        disabled={disabled}
                        title={`Run ${service.label} now`}
                        className={`
              inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1
              font-mona text-[10px] font-bold transition-all duration-150
              active:scale-95
              disabled:pointer-events-none disabled:opacity-40
              ${status === "failed"
                                ? "bg-red-600 text-white hover:brightness-110"
                                : "border border-border bg-white text-text-muted hover:border-primary hover:text-primary"
                            }
            `}
                    >
                        <Play size={10} />
                        {status === "completed" || status === "failed" ? "Again" : "Run"}
                    </button>
                </div>
            )}
        </div>
    );
};