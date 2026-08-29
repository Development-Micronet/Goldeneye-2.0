import React from "react";
import { polygonIcon, selectionIcon } from "../../../assets";
import { useMapStore, type AnalyticsDrawTool } from "../store/useMapStore";

interface AnalyticsDrawPopupProps {
  onClose?: () => void;
}

const DRAW_OPTIONS: Array<{
  id: "polygon" | "rectangle";
  label: string;
  icon: string;
  toolName: AnalyticsDrawTool;
}> = [
  {
    id: "polygon",
    label: "Draw Polygon",
    icon: polygonIcon,
    toolName: "polygon",
  },
  {
    id: "rectangle",
    label: "Draw Rectangle",
    icon: selectionIcon,
    toolName: "rectangle",
  },
];

export const AnalyticsDrawPopup: React.FC<AnalyticsDrawPopupProps> = ({ onClose }) => {
  const activeDrawTool = useMapStore((state) => state.activeDrawTool);
  const setActiveDrawTool = useMapStore((state) => state.setActiveDrawTool);

  return (
    <div className="pointer-events-auto absolute -top-3 left-full z-50 ml-2 flex">
      <div className="flex w-[calc(100vw-70px)] max-w-[220px] flex-col space-y-1.5 rounded-lg border border-gray-200 bg-white p-2.5 shadow-xl sm:w-[220px]">
        <div className="border-b border-gray-100 pb-1.5 text-[11px] font-semibold text-gray-700">
          Draw AOI to GeoTIFF
        </div>
        <p className="text-[10px] text-gray-400">
          Draw an area on the map. It will automatically capture screenshot, convert to GeoTIFF, and
          add to your Raster layer list.
        </p>

        <div className="mt-1 flex flex-col space-y-1">
          {DRAW_OPTIONS.map((option) => {
            const isSelected = activeDrawTool === option.toolName;

            return (
              <div
                key={option.id}
                onClick={() => {
                  setActiveDrawTool(isSelected ? null : option.toolName);
                  if (onClose) onClose();
                }}
                className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDrawPopup;
