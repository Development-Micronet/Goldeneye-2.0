import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useMapStore } from "../../store/useMapStore";
import { DRAW_OPTIONS } from "./leftSidebar.config";
import { BufferSettingsModal } from "./BufferSettingsModal";
import { CoordinateSettingsModal } from "./CoordinateSettingsModal";

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
    <div className="absolute left-full -top-3 ml-2 z-50 pointer-events-auto flex">
      {/* Menu List Container */}
      <div className="bg-white border border-gray-200 shadow-xl p-2 sm:p-3 w-[calc(100vw-70px)] max-w-[200px] sm:w-[200px] flex flex-col space-y-1.5 sm:space-y-2 rounded-lg">
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
              className={`flex items-center justify-between px-1.5 py-1 rounded-md transition-colors cursor-pointer group ${
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <img
                  src={option.icon}
                  alt={option.label}
                  className="w-4.5 h-4.5 sm:w-5 sm:h-5 object-contain"
                />
                <span className="text-[11px] sm:text-xs font-medium">
                  {option.label}
                </span>
              </div>

              {option.hasSettings && (
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetSubMenu = isSubMenuOpen ? null : option.id;
                    setActiveSubMenu(targetSubMenu);
                  }}
                  className="w-6 h-5.5 sm:w-8 sm:h-7 rounded bg-primary/5 hover:bg-primary/15 border border-primary/10 flex items-center justify-center text-primary transition-colors cursor-pointer select-none"
                >
                  {isSubMenuOpen ? (
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
            toast.success(
              `Point buffer distance set to ${pointBufferDistance} km`,
            );
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
            toast.success(
              `Polyline buffer distance set to ${polylineBufferDistance} km`,
            );
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
