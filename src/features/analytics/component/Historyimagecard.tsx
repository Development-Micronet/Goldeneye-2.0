import { useState } from "react";
import {
    CalendarDays,
    Crosshair,
    Download,
    FileImage,
    Layers,
    Pencil,
    Trash2,
} from "lucide-react";
import {
    getOperation,
    getPerformedOperations,
    OPERATION_LABELS,
} from "../service/Analytics.service";
import type { CompanyImage, OperationKey } from "../service/Analytics.service";
import type { GeoTIFFMetadata } from "../utils/geotiffRaster";

/** Which raster of a record is being shown: the base result or a detection output. */
export type Variant = "base" | OperationKey;

interface HistoryImageCardProps {
    image: CompanyImage;
    displayName: string;
    activeVariants: Set<Variant>;
    loadingVariants: Set<Variant>;
    metadata?: GeoTIFFMetadata;
    error?: string;
    onToggleVariant: (variant: Variant) => void;
    onZoom: () => void;
    onRemoveAll: () => void;
    onDownload: () => void;
    onRename: (name: string) => void;
}

const formatDate = (timestamp: number, fallback: string) => {
    if (!timestamp) return fallback;
    return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatBounds = (metadata: GeoTIFFMetadata) => {
    const { west, south, east, north } = metadata.bounds;
    return `${west.toFixed(2)}, ${south.toFixed(2)} → ${east.toFixed(2)}, ${north.toFixed(2)}`;
};

const HistoryImageCard = ({
    image,
    displayName,
    activeVariants,
    loadingVariants,
    metadata,
    error,
    onToggleVariant,
    onZoom,
    onRemoveAll,
    onDownload,
    onRename,
}: HistoryImageCardProps) => {
    const [renaming, setRenaming] = useState(false);
    const [draftName, setDraftName] = useState(displayName);
    const [showDetails, setShowDetails] = useState(false);

    const performed = getPerformedOperations(image);
    const baseActive = activeVariants.has("base");
    const baseLoading = loadingVariants.has("base");
    const anythingOnMap = activeVariants.size > 0;

    const commitRename = () => {
        const trimmed = draftName.trim();
        if (trimmed) onRename(trimmed);
        setRenaming(false);
    };

    return (
        <div className="border-border rounded-lg border bg-white p-2.5">
            <div className="flex gap-2.5">
                <div className="bg-primary-100 h-16 w-16 shrink-0 overflow-hidden rounded-md">
                    {image.imageUrl ? (
                        <img
                            src={image.imageUrl}
                            alt={displayName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(event) => {
                                (event.currentTarget as HTMLImageElement).style.visibility = "hidden";
                            }}
                        />
                    ) : (
                        <div className="text-nav-inactive flex h-full w-full items-center justify-center">
                            <FileImage size={18} />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    {renaming ? (
                        <input
                            autoFocus
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") commitRename();
                                if (event.key === "Escape") {
                                    setDraftName(displayName);
                                    setRenaming(false);
                                }
                            }}
                            className="border-border text-primary focus:border-primary w-full rounded border px-1.5 py-0.5 text-xs font-semibold outline-none"
                        />
                    ) : (
                        <p className="text-primary truncate text-xs font-semibold">{displayName}</p>
                    )}

                    <p className="text-text-secondary mt-0.5 truncate text-[11px]">{image.fileName}</p>

                    <div className="text-text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays size={10} />
                            {formatDate(image.timestamp, image.date)}
                        </span>

                        <span className="inline-flex items-center gap-1">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${anythingOnMap ? "bg-primary" : "bg-nav-inactive"
                                    }`}
                            />
                            {anythingOnMap ? `${activeVariants.size} on map` : "Idle"}
                        </span>

                        {!performed.length && (
                            <span className="text-text-secondary">No detections</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Detection outputs — each is its own raster layer. */}
            {performed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {performed.map((key) => {
                        const active = activeVariants.has(key);
                        const loading = loadingVariants.has(key);
                        const operation = getOperation(image, key);

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onToggleVariant(key)}
                                disabled={loading || !operation?.cogUrl}
                                title={`${active ? "Hide" : "Show"} ${OPERATION_LABELS[key]} detection layer`}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${active
                                    ? "bg-primary text-white"
                                    : "bg-primary-100 text-primary hover:bg-primary hover:text-white"
                                    }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-primary"
                                        }`}
                                />
                                {loading ? "…" : OPERATION_LABELS[key]}
                            </button>
                        );
                    })}
                </div>
            )}

            {error && (
                <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">{error}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onToggleVariant("base")}
                    disabled={baseLoading || !image.cogUrl}
                    title={!image.cogUrl ? "No GeoTIFF available for this result" : undefined}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${baseActive ? "border-primary text-primary border bg-white" : "bg-primary text-white"
                        }`}
                >
                    <Layers size={12} />
                    {baseLoading ? "Loading…" : baseActive ? "Showing" : "Show on Map"}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setDraftName(displayName);
                        setRenaming(true);
                    }}
                    title="Rename"
                    className="border-border text-text-muted hover:bg-primary-100 inline-flex items-center rounded-md border p-1.5 transition"
                >
                    <Pencil size={12} />
                </button>

                <button
                    type="button"
                    onClick={onZoom}
                    disabled={!metadata}
                    title="Zoom to result"
                    className="border-border text-text-muted hover:bg-primary-100 inline-flex items-center rounded-md border p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Crosshair size={12} />
                </button>

                <button
                    type="button"
                    onClick={onDownload}
                    disabled={!image.cogUrl}
                    title="Download GeoTIFF"
                    className="border-border text-text-muted hover:bg-primary-100 inline-flex items-center rounded-md border p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Download size={12} />
                </button>

                <button
                    type="button"
                    onClick={onRemoveAll}
                    disabled={!anythingOnMap}
                    title="Remove from map"
                    className="border-border text-text-muted hover:bg-primary-100 inline-flex items-center rounded-md border p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Trash2 size={12} />
                </button>

                {metadata && (
                    <button
                        type="button"
                        onClick={() => setShowDetails((value) => !value)}
                        className="text-text-secondary ml-auto text-[11px] underline-offset-2 hover:underline"
                    >
                        {showDetails ? "Hide details" : "Details"}
                    </button>
                )}
            </div>

            {showDetails && metadata && (
                <dl className="border-border text-text-muted mt-2 space-y-0.5 border-t pt-2 text-[11px]">
                    <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">Resolution</dt>
                        <dd>
                            {metadata.width} × {metadata.height}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">Projection</dt>
                        <dd>{metadata.projection}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary">Bands</dt>
                        <dd>{metadata.samplesPerPixel}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-text-secondary shrink-0">Bounds</dt>
                        <dd className="truncate text-right">{formatBounds(metadata)}</dd>
                    </div>
                </dl>
            )}
        </div>
    );
};

export default HistoryImageCard;