import { FiMapPin, FiMinus, FiPlus, FiRefreshCw } from "react-icons/fi";
import { Tooltip } from "react-tooltip";
import React, { useRef, useState } from "react";
import useZoomStore from "../hooks/useZoomStore";
import BaseMapSwitcher from "./BaseMapSwitcher";

const ZoomSidebar: React.FC = () => {
  const { zoom, minZoom, maxZoom, setZoom, zoomIn, zoomOut, resetZoom } = useZoomStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const defaultPosition = {
    x: 5,
    y: window.innerHeight - 450,
  };
  const [position, setPosition] = useState(defaultPosition);
  const dragRef = useRef(false);
  const offset = useRef({
    x: 0,
    y: 0,
  });
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = true;

    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;

    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };
  const handleMouseUp = () => {
    dragRef.current = false;

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
  const resetPosition = () => {
    setIsAnimating(true);

    setPosition({
      x: defaultPosition.x,
      y: defaultPosition.y,
    });

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };
  return (
    <>
      <style>
        {`
          .zoom-vertical-slider {
            appearance:none;
            writing-mode:vertical-lr;
            direction:rtl;
            width:6px;
            height:120px;
            background:#d1d5db;
            border-radius:999px;
          }

          .zoom-vertical-slider::-webkit-slider-thumb {
            appearance:none;
            width:16px;
            height:16px;
            background:#2563eb;
            border-radius:50%;
            border:2px solid white;
            cursor:pointer;
          }
        `}
      </style>

      <div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 40,
        }}
        onMouseDown={handleMouseDown}
        className={`flex w-[50px] cursor-move flex-col items-center rounded-xl border border-gray-300 bg-white py-3 shadow-lg ${isAnimating ? "transition-all duration-1000 ease-out" : ""} `}
      >
        <button
          onClick={zoomIn}
          className="hover:bg-primary/10 hover:text-primary cursor-pointer rounded-lg p-2 text-gray-700"
        >
          <FiPlus size={20} />
        </button>

        <span className="text-primary my-2 text-xs font-semibold">{zoom}</span>

        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="zoom-vertical-slider cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
        />

        <button
          onClick={zoomOut}
          className="hover:bg-primary/10 hover:text-primary mt-3 rounded-lg p-2 text-gray-700"
        >
          <FiMinus size={20} />
        </button>

        <button
          onClick={resetZoom}
          className="hover:bg-primary/10 hover:text-primary mt-3 rounded-lg p-2 text-gray-700"
        >
          <FiRefreshCw size={18} />
        </button>

        <div onMouseDown={(e) => e.stopPropagation()} className="mt-2">
          <BaseMapSwitcher />
        </div>

        <button
          onClick={resetPosition}
          onMouseDown={(e) => e.stopPropagation()}
          data-tooltip-id="zoom-tooltip"
          data-tooltip-content="Reset Position"
          className="hover:bg-primary/10 hover:text-primary mt-3 rounded-lg p-2 text-gray-700 transition"
        >
          <FiMapPin size={18} />
        </button>

        <Tooltip
          id="zoom-tooltip"
          place="right"
          className="!rounded !bg-gray-900 !px-2 !py-1 !text-xs !text-white"
        />
      </div>
    </>
  );
};

export default ZoomSidebar;
