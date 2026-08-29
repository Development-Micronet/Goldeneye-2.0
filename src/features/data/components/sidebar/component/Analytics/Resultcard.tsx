import React, { useState } from "react";
import { toast } from "react-toastify";
import { Check, Crosshair, Download, Layers, Pencil, Trash2, X } from "lucide-react";
import type { RasterOperation } from "../../../../hooks/useRasterStore";
import {
  formatClock,
  formatDuration,
  SERVICE_BY_NAME,
} from "../../../../../../constant/Analytics.config";

/** Blob download, with a new-tab fallback when the bucket blocks CORS. */
const downloadResult = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);

    if (!response.ok) throw new Error(String(response.status));

    const blobUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");

    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener");
  }
};

const IconAction: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    tone?: "default" | "danger";
  }
> = ({ label, tone = "default", className = "", ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    {...props}
    className={`border-border text-text-secondary focus-visible:outline-primary flex h-7 w-7 items-center justify-center rounded-md border bg-white transition-all duration-150 hover:-translate-y-px hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
      tone === "danger"
        ? "hover:border-red-300 hover:text-red-600"
        : "hover:border-primary hover:text-primary"
    } ${className} `}
  />
);

interface ResultCardProps {
  operation: RasterOperation;
  layerName?: string;
  isOnMap: boolean;
  onShow: () => void;
  onZoom: () => void;
  onRename: (fileName: string) => void;
  onDelete: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  operation,
  layerName,
  isOnMap,
  onShow,
  onZoom,
  onRename,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(operation.fileName ?? "");

  const Icon = SERVICE_BY_NAME.get(operation.type)?.icon ?? Layers;

  const displayName =
    operation.fileName?.trim() || `${operation.type}-result-${operation.id.slice(0, 6)}`;

  const commit = () => {
    const next = draft.trim();

    if (next && next !== operation.fileName) {
      onRename(next);
      toast.success("Result renamed");
    }

    setEditing(false);
  };

  return (
    <div
      className={`group relative mb-2 overflow-hidden rounded-lg border p-3 transition-all duration-200 ${
        isOnMap
          ? "border-primary bg-primary-100 ring-primary shadow-[0_1px_12px_-4px_rgba(44,102,113,0.45)] ring-1"
          : "border-border hover:border-primary/40 bg-white hover:shadow-sm"
      } `}
    >
      {/* spine: filled when this result is the one painted on the map */}
      <span
        className={`absolute inset-y-0 left-0 w-[3px] transition-colors duration-200 ${
          isOnMap ? "bg-primary" : "bg-border group-hover:bg-primary/40"
        }`}
      />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon size={14} className="text-primary shrink-0" />

            <h4 className="font-mona text-primary text-[13px] font-semibold capitalize">
              {operation.type}
            </h4>

            {isOnMap && (
              <span className="bg-primary font-mona rounded-full px-1.5 py-px text-[9px] font-bold tracking-wider text-white uppercase">
                On map
              </span>
            )}

            {operation.aoiApplied && (
              <span className="border-primary/30 font-mona text-primary rounded-full border px-1.5 py-px text-[9px] font-semibold tracking-wider uppercase">
                AOI
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-1.5 flex items-center gap-1">
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit();
                  if (event.key === "Escape") setEditing(false);
                }}
                className="border-primary/40 text-text-muted focus:border-primary min-w-0 flex-1 rounded border bg-white px-1.5 py-1 text-[11px] outline-none"
                placeholder="File name"
              />

              <IconAction label="Save name" onClick={commit}>
                <Check size={13} />
              </IconAction>

              <IconAction label="Cancel" onClick={() => setEditing(false)}>
                <X size={13} />
              </IconAction>
            </div>
          ) : (
            <>
              <p className="text-text-secondary mt-1 truncate text-[11px]" title={displayName}>
                {displayName}
              </p>

              {layerName && (
                <p className="font-mona text-text-secondary truncate text-[10px]">
                  from {layerName}
                </p>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mona text-primary text-lg leading-none font-bold tabular-nums">
            {operation.count}
          </p>
          <p className="font-mona text-text-secondary text-[9px] font-semibold tracking-wider uppercase">
            found
          </p>
        </div>
      </div>

      <p className="text-text-muted mt-2 pl-1.5 text-[11px] leading-relaxed">{operation.message}</p>

      <div className="border-border mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5 pl-1.5">
        <button
          type="button"
          onClick={onShow}
          disabled={isOnMap}
          className={`font-mona focus-visible:outline-primary inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isOnMap
              ? "bg-primary/10 text-primary cursor-default"
              : "bg-primary text-white hover:brightness-110 active:scale-[0.97]"
          } `}
        >
          <Layers size={12} />
          {isOnMap ? "Showing" : `Show ${operation.type}`}
        </button>

        <div className="flex items-center gap-1">
          <IconAction
            label="Rename result"
            onClick={() => {
              setDraft(operation.fileName ?? displayName);
              setEditing(true);
            }}
          >
            <Pencil size={13} />
          </IconAction>

          <IconAction label="Zoom to result" onClick={onZoom}>
            <Crosshair size={13} />
          </IconAction>

          <IconAction
            label="Download image"
            onClick={() =>
              downloadResult(operation.cogFileUrl || operation.imageUrl, `${displayName}.tif`)
            }
          >
            <Download size={13} />
          </IconAction>

          <IconAction label="Delete result" tone="danger" onClick={onDelete}>
            <Trash2 size={13} />
          </IconAction>
        </div>
      </div>

      <p className="font-mona text-text-secondary mt-2 pl-1.5 text-[10px] tabular-nums">
        {formatClock(operation.createdAt)} · {formatDuration(operation.durationMs)}
      </p>
    </div>
  );
};
