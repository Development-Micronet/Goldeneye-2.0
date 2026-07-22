import { toast } from "react-toastify";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMapStore } from "../../store/useMapStore";
import { BufferSettingsModal } from "./BufferSettingsModal";
import { CoordinateSettingsModal } from "./CoordinateSettingsModal";
import { DRAW_OPTIONS } from "./leftSidebar.config";

interface DrawPopupProps {
  onClose?: () => void;
}

export const DrawPopup: React.FC<DrawPopupProps> = ({ onClose }) => {
  const {
    activeTool,
    activeSubMenu,
    pointBufferDistance,
    polylineBufferDistance,
    setActiveTool,
    setActiveSubMenu,
    setPointBufferDistance,
    setPolylineBufferDistance,
  } = useMapStore();
  return (
    <div className="pointer-events-auto absolute -top-3 left-full z-50 ml-2 flex">
      {/* Menu List Container */}
      <div className="flex w-[calc(100vw-70px)] max-w-[200px] flex-col space-y-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-xl sm:w-[200px] sm:space-y-2 sm:p-3">
        {DRAW_OPTIONS.map((option) => {
          const isSelected = activeTool === option.toolName;
          const isSubMenuOpen = activeSubMenu === option.id;

          return (
            <div
              key={option.id}
              onClick={() => {
                setActiveTool(isSelected ? null : option.toolName);
                if (onClose) onClose();
              }}
              className={`group flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 transition-colors ${
                isSelected ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <img
                  src={option.icon}
                  alt={option.label}
                  className="h-4.5 w-4.5 object-contain sm:h-5 sm:w-5"
                />
                <span className="text-[11px] font-medium sm:text-xs">{option.label}</span>
              </div>

              {option.hasSettings && (
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetSubMenu = isSubMenuOpen ? null : option.id;
                    setActiveSubMenu(targetSubMenu);
                  }}
                  className="bg-primary/5 hover:bg-primary/15 border-primary/10 text-primary flex h-5.5 w-6 cursor-pointer items-center justify-center rounded border transition-colors select-none sm:h-7 sm:w-8"
                >
                  {isSubMenuOpen ? (
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Point Settings Modal */}
      {activeSubMenu === "point" && (
        <BufferSettingsModal
          title="Buffer Distance"
          value={pointBufferDistance}
          onChange={setPointBufferDistance}
          onReset={() => setPointBufferDistance("2.25")}
          onConfirm={() => {
            toast.success(`Point buffer distance set to ${pointBufferDistance} km`);
            setActiveSubMenu(null);
            if (onClose) onClose();
          }}
        />
      )}

      {/* Polyline Settings Modal */}
      {activeSubMenu === "polyline" && (
        <BufferSettingsModal
          title="Buffer Distance"
          value={polylineBufferDistance}
          onChange={setPolylineBufferDistance}
          onReset={() => setPolylineBufferDistance("2.25")}
          onConfirm={() => {
            toast.success(`Polyline buffer distance set to ${polylineBufferDistance} km`);
            setActiveSubMenu(null);
            if (onClose) onClose();
          }}
        />
      )}

      {/* Coordinates Settings Modal */}
      {activeSubMenu === "coordinates" && (
        <CoordinateSettingsModal
          onConfirm={() => {
            setActiveSubMenu(null);
            if (onClose) onClose();
          }}
        />
      )}
    </div>
  );
};
export default DrawPopup;
