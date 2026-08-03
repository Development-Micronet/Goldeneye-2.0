import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X, Check, MapPin, AlertCircle, Move } from "lucide-react";

interface AOIDialogProps {
  file: File;
  onCancel: () => void;
  onSave: (extent: number[]) => void;
}

const AOIDialog: React.FC<AOIDialogProps> = ({ file, onCancel, onSave }) => {
  const [xmin, setXmin] = useState("");
  const [ymin, setYmin] = useState("");
  const [xmax, setXmax] = useState("");
  const [ymax, setYmax] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Drag-to-move
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    const rect = panelRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleSave = () => {
    setError(null);
    const values = [xmin, ymin, xmax, ymax].map(Number);

    if ([xmin, ymin, xmax, ymax].some((v) => v.trim() === "") || values.some((v) => Number.isNaN(v))) {
      setError("Please fill in all four coordinate fields with valid numbers.");
      return;
    }

    if (values[0] >= values[2] || values[1] >= values[3]) {
      setError("Min values must be smaller than Max values.");
      return;
    }

    onSave(values);
  };

  const panelStyle: React.CSSProperties = panelPos
    ? { position: "fixed", left: panelPos.x, top: panelPos.y, transform: "none" }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[3000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          width: 340,
          minWidth: 280,
          maxWidth: "90vw",
          minHeight: 220,
          resize: "both",
          overflow: "hidden",
        }}
        className="relative flex flex-col rounded-xl b bg-white shadow-xl"
      >
        {/* Header */}
        <div
          className="flex cursor-grab items-center justify-between  px-3 py-2 active:cursor-grabbing"
          onMouseDown={handleHeaderMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 text-teal-600">
              <MapPin size={15} />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs font-bold text-gray-800">
                  Set Image Bounds
                </h3>
                <Move size={11} className="text-gray-400" />
              </div>

              <p
                className="max-w-[160px] truncate text-[10px] text-gray-400"
                title={file.name}
              >
                {file.name}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={15} />
          </button>
        </div>


        {/* Body */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            <CoordinateInput
              label="Min Lon"
              placeholder="-180"
              value={xmin}
              setValue={setXmin}
            />

            <CoordinateInput
              label="Min Lat"
              placeholder="-90"
              value={ymin}
              setValue={setYmin}
            />

            <CoordinateInput
              label="Max Lon"
              placeholder="180"
              value={xmax}
              setValue={setXmax}
            />

            <CoordinateInput
              label="Max Lat"
              placeholder="90"
              value={ymax}
              setValue={setYmax}
            />
          </div>


          {/* Hint */}
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1.5 text-[10px] text-gray-500">
            <MapPin size={11} className="text-teal-500" />

            <span>
              Bounds in <strong>EPSG:4326</strong>
            </span>
          </div>


          {/* Error */}
          {error && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[10px] text-red-700">
              <AlertCircle size={11} className="text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="flex justify-end gap-2  px-3 py-2">
          <button
            onClick={onCancel}
            className="rounded-md bg-teal-50 text-primary  px-3 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"
          >
            <Check size={12} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

interface CoordinateInputProps {
  label: string;
  placeholder: string;
  value: string;
  setValue: (value: string) => void;
}

const CoordinateInput = ({ label, placeholder, value, setValue }: CoordinateInputProps) => (
  <div>
    <label className="mb-1 block text-[11px] font-semibold text-gray-600">{label}</label>
    <input
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full rounded-lg  bg-gray-50/50 px-2.5 py-1.5 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
    />
  </div>
);

export default AOIDialog;
