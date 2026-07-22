import { FiLayers } from "react-icons/fi";
import { Tooltip } from "react-tooltip";
import React, { useState } from "react";
import useBaseMapStore, { type BaseMapType } from "../hooks/useBaseMapStore";

const BaseMapSwitcher: React.FC = () => {
  const { activeLayer, setActiveLayer } = useBaseMapStore();
  const [open, setOpen] = useState(false);
  const layers: BaseMapType[] = ["Google Road Map", "ESRI Imagery", "OpenStreetMap"];

  return (
    <div className="relative">
      {/* Layer Icon */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        data-tooltip-id="layer-tooltip"
        data-tooltip-content="Change Map Layer"
        className={`flex h-10 w-8 items-center justify-center rounded-lg transition ${
          open
            ? "bg-primary/10 text-primary"
            : "hover:bg-primary/10 hover:text-primary text-gray-700"
        }`}
      >
        <FiLayers size={20} />
      </button>
      {/* Layer Options */}
      {open && (
        <div className="absolute -top-10 left-12 w-32 -translate-y-6 rounded-lg border border-gray-300 bg-white p-2 shadow-md">
          <p className="mb-1 text-[11px] font-semibold text-gray-500">Layers</p>

          <div className="flex flex-col gap-1">
            {layers.map((layer) => (
              <label
                key={layer}
                className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
              >
                <input
                  type="radio"
                  name="basemap"
                  value={layer}
                  checked={activeLayer === layer}
                  onChange={() => {
                    setActiveLayer(layer);
                    setOpen(false);
                  }}
                  className="accent-primary h-3 w-3"
                />

                <span className={activeLayer === layer ? "text-primary font-semibold" : ""}>
                  {layer}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <Tooltip
        id="layer-tooltip"
        place="right"
        className="!rounded !bg-gray-900 !px-2 !py-1 !text-xs !text-white"
      />
    </div>
  );
};

export default BaseMapSwitcher;
