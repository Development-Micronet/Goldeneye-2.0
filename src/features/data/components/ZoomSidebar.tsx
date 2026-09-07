import { FiMinus, FiPlus, FiRefreshCw } from "react-icons/fi";
import React from "react";
import useZoomStore from "../hooks/useZoomStore";
import BaseMapSwitcher from "./BaseMapSwitcher";

const ZoomSidebar: React.FC = () => {
  const { zoom, minZoom, maxZoom, setZoom, zoomIn, zoomOut, resetZoom } = useZoomStore();

  return (
    <>
      <style>
        {`
          .zoom-vertical-slider {
            appearance: none;
            writing-mode: vertical-lr;
            direction: rtl;
            width: 5px;
            height: 85px;
            background: #d1d5db;
            border-radius: 999px;
          }

          .zoom-vertical-slider::-webkit-slider-thumb {
            appearance: none;
            width: 13px;
            height: 13px;
            background: #2563eb;
            border-radius: 50%;
            border: 2px solid white;
            cursor: pointer;
          }
        `}
      </style>

      <div className="absolute bottom-20 left-2 z-40 flex w-[42px] sm:w-[44px] flex-col items-center rounded-xl border border-gray-300 bg-white py-2.5 shadow-lg transition-all">
        <button
          onClick={() => {
            if (zoom < maxZoom) {
              zoomIn();
            }
          }}
          className="hover:bg-primary/10 hover:text-primary cursor-pointer rounded-lg p-1.5 text-gray-700 transition"
          title="Zoom In"
        >
          <FiPlus size={17} />
        </button>

        <span className="text-primary my-1 text-xs font-bold">{zoom}</span>

        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          value={zoom}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value <= maxZoom) {
              setZoom(value);
            }
          }}
          className="zoom-vertical-slider cursor-pointer"
        />

        <button
          onClick={() => {
            if (zoom > minZoom) {
              zoomOut();
            }
          }}
          className="hover:bg-primary/10 hover:text-primary mt-2 cursor-pointer rounded-lg p-1.5 text-gray-700 transition"
          title="Zoom Out"
        >
          <FiMinus size={17} />
        </button>

        <button
          onClick={resetZoom}
          className="hover:bg-primary/10 hover:text-primary mt-2 cursor-pointer rounded-lg p-1.5 text-gray-700 transition"
          title="Reset Zoom"
        >
          <FiRefreshCw size={15} />
        </button>

        <div className="mt-1.5">
          <BaseMapSwitcher />
        </div>
      </div>
    </>
  );
};

export default ZoomSidebar;
