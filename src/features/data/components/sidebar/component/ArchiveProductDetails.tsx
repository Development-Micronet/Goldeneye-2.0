import { X } from "lucide-react";
import { useRef, useState } from "react";
import type { SelectedArchiveProduct } from "../store/useArchiveProductStore";

interface Props {
  product: SelectedArchiveProduct;
  onClose: () => void;
}

type ResizeDirection =
  "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export function ArchiveProductDetails({ product, onClose }: Props) {
  const raw = product.raw;

  const [box, setBox] = useState({
    x: 770,
    y: 390,
    width: 500,
    height: 500,
  });

  const resizing = useRef(false);
  const dragging = useRef(false);

  const dragOffset = useRef({
    x: 0,
    y: 0,
  });

  // -------------------------
  // Drag panel
  // -------------------------

  const startDrag = (e: React.MouseEvent) => {
    dragging.current = true;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "move";

    dragOffset.current = {
      x: e.clientX - box.x,
      y: e.clientY - box.y,
    };

    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;

      setBox((prev) => ({
        ...prev,

        x: event.clientX - dragOffset.current.x,

        y: event.clientY - dragOffset.current.y,
      }));
    };

    const onUp = () => {
      dragging.current = false;

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      window.removeEventListener("mousemove", onMove);

      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);

    window.addEventListener("mouseup", onUp);
  };

  // -------------------------
  // Resize panel
  // -------------------------

  const startResize = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();

    resizing.current = true;

    document.body.style.userSelect = "none";

    const start = {
      mouseX: e.clientX,
      mouseY: e.clientY,

      ...box,
    };

    const onMove = (event: MouseEvent) => {
      if (!resizing.current) return;

      const dx = event.clientX - start.mouseX;

      const dy = event.clientY - start.mouseY;

      setBox(() => {
        let width = start.width;
        let height = start.height;

        let x = start.x;
        let y = start.y;

        // Right
        if (direction.includes("right")) {
          width = start.width + dx;
        }

        // Left
        if (direction.includes("left")) {
          width = start.width - dx;
          x = start.x + dx;
        }

        // Bottom
        if (direction.includes("bottom")) {
          height = start.height + dy;
        }

        // Top
        if (direction.includes("top")) {
          height = start.height - dy;
          y = start.y + dy;
        }

        const minWidth = 280;
        const minHeight = 250;

        if (width < minWidth) {
          width = minWidth;

          if (direction.includes("left")) {
            x = start.x + start.width - minWidth;
          }
        }

        if (height < minHeight) {
          height = minHeight;

          if (direction.includes("top")) {
            y = start.y + start.height - minHeight;
          }
        }

        return {
          x,
          y,
          width,
          height,
        };
      });
    };

    const onUp = () => {
      resizing.current = false;

      document.body.style.userSelect = "";

      window.removeEventListener("mousemove", onMove);

      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);

    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
      }}

      className="fixed z-[999] flex flex-col overflow-hidden border border-gray-200 bg-white shadow-2xl"
    >
      {/* HEADER */}

      <div
        onMouseDown={startDrag}

        className="flex cursor-move items-center justify-between border-b px-4 py-3 select-none"
      >
        <h2 className="text-sm font-semibold text-gray-800">Archive Image Details</h2>

        <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {/* CONTENT */}

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3">
          <Field
            label="Acquisition"
            value={raw?.acquisitionDate ? new Date(raw.acquisitionDate).toUTCString() : "-"}
          />

          <Field label="Resolution" value={`${raw?.resolution ?? "-"} m`} />

          <Field label="Incidence" value={`${raw?.incidenceAngle?.toFixed(2) ?? "-"}°`} />

          <Field label="Cloud" value={`${raw?.cloudCover ?? "-"}%`} />

          <Field label="Platform" value={raw?.platform} />

          <Field label="Sensor" value={product.sensor} />

          <Field label="Level" value={raw?.processingLevel} />

          <Field label="Type" value={raw?.productType} />

          <Field label="Spectral" value={raw?.spectralRange} />

          <Field label="Sensor Type" value={raw?.sensorType} />

          <Field label="Workspace" value={raw?.workspaceName} />

          <Field label="Status" value={raw?.productionStatus} />
        </div>

        {product.imageUrl && (
          <div className="p-3">
            <img src={product.imageUrl} className="h-52 w-full rounded-md object-cover shadow-sm" />
          </div>
        )}
      </div>

      {/* RESIZE HANDLES */}

      <ResizeHandle side="left" cursor="ew-resize" onResize={startResize} />

      <ResizeHandle side="right" cursor="ew-resize" onResize={startResize} />

      <ResizeHandle side="top" cursor="ns-resize" onResize={startResize} />

      <ResizeHandle side="bottom" cursor="ns-resize" onResize={startResize} />

      <ResizeHandle side="top-left" cursor="nwse-resize" onResize={startResize} />

      <ResizeHandle side="top-right" cursor="nesw-resize" onResize={startResize} />

      <ResizeHandle side="bottom-left" cursor="nesw-resize" onResize={startResize} />

      <ResizeHandle side="bottom-right" cursor="nwse-resize" onResize={startResize} />
    </div>
  );
}

function ResizeHandle({
  side,
  cursor,
  onResize,
}: {
  side: ResizeDirection;
  cursor: string;
  onResize: (e: React.MouseEvent, side: ResizeDirection) => void;
}) {
  const positions = {
    left: "left-0 top-0 h-full w-2",

    right: "right-0 top-0 h-full w-2",

    top: "top-0 left-0 h-2 w-full",

    bottom: "bottom-0 left-0 h-2 w-full",

    "top-left": "top-0 left-0 h-4 w-4",

    "top-right": "top-0 right-0 h-4 w-4",

    "bottom-left": "bottom-0 left-0 h-4 w-4",

    "bottom-right": "bottom-0 right-0 h-4 w-4",
  };

  return (
    <div
      onMouseDown={(e) => onResize(e, side)}

      style={{
        cursor,
      }}

      className={`absolute z-50 ${positions[side]} hover:bg-blue-400/40`}
    />
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-primary text-[10px] font-semibold tracking-wide uppercase">{label}</p>

      <p className="truncate text-xs font-medium text-gray-800" title={String(value ?? "-")}>
        {value ?? "-"}
      </p>
    </div>
  );
}
