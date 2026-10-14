import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useEffect, useRef, useState } from "react";
import { RasterIcon, Baselayer, drawIcon } from "../../../assets";
import { Loader2 } from "lucide-react";

import RasterPopup from "./RasterPopup";
import { useMapStore } from "../../data/store/useMapStore";
import { useRasterStore } from "../store/useRasterStore";
import BasemapPopup from "./BasemapPopup";
import AnalyticsDrawPopup from "./AnalyticsDrawPopup";

interface LeftSidebarProps {
  activeIndex?: number | null;
  setActiveIndex?: (index: number | null) => void;
}

export default function LeftSidebar({
  activeIndex: propActiveIndex,
  setActiveIndex: propSetActiveIndex,
}: LeftSidebarProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(null);

  const activeIndex = propActiveIndex !== undefined ? propActiveIndex : internalActiveIndex;

  const setActiveIndex = propSetActiveIndex || setInternalActiveIndex;

  const { resetMapState } = useMapStore();
  const rasterStatus = useRasterStore((s) => s.rasterStatus);
  const isRasterLoading = rasterStatus === "reading" || rasterStatus === "rendering";

  useEffect(() => {
    if (activeIndex !== null) {
      resetMapState();
    }
  }, [activeIndex, resetMapState]);

  const sidebarItems = [
    {
      id: 1,
      icon: RasterIcon,
      tooltip: "Raster",
    },
    {
      id: 2,
      icon: Baselayer,
      tooltip: "Basemaps",
    },
    {
      id: 3,
      icon: drawIcon,
      tooltip: "Draw AOI to GeoTIFF",
    },
  ];

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setActiveIndex]);

  const handleItemClick = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <nav
      ref={sidebarRef}
      aria-label="Tools"
      className="absolute top-0 left-0 z-40 flex h-fit w-[50px] flex-col rounded-r-lg border border-l-0 border-gray-200 bg-white py-1.5 shadow-[0_2px_12px_rgba(15,23,42,0.07)] sm:w-[58px] md:w-[65px]"
    >
      <ul className="flex w-full flex-col items-center gap-2">
        {sidebarItems.map((item, index) => {
          const isActive = activeIndex === index;
          const isItemLoading = index === 0 && isRasterLoading;

          return (
            <li key={item.id} className="relative flex w-full justify-center">
              {/* active rail indicator */}
              {isActive && (
                <span
                  aria-hidden
                  className="bg-primary absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                />
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleItemClick(index)}
                  aria-label={item.tooltip}
                  aria-expanded={isActive}
                  data-tooltip-id={isActive ? undefined : "left-sidebar-tooltip"}
                  data-tooltip-content={
                    isItemLoading ? "Raster (Uploading...)" : item.tooltip
                  }
                  className={`group focus-visible:ring-primary/40 flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150 outline-none focus-visible:ring-2 sm:h-10 sm:w-10 md:h-10 md:w-10 ${
                    isActive
                      ? "bg-primary/10 text-primary ring-primary/15 ring-1"
                      : isItemLoading
                      ? "bg-teal-50 text-teal-700 ring-1 ring-teal-400/60 hover:bg-teal-100/70"
                      : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <img
                      src={item.icon}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className={`h-[18px] w-[18px] object-contain transition-opacity ${
                        isActive || isItemLoading
                          ? "opacity-100"
                          : "opacity-60 group-hover:opacity-90"
                      }`}
                    />
                    {isItemLoading && (
                      <span
                        title="Uploading raster..."
                        className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-teal-500"
                      >
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-teal-600" />
                      </span>
                    )}
                  </div>
                </button>

                {index === 0 && isActive && <RasterPopup onClose={() => setActiveIndex(null)} />}

                {index === 1 && isActive && <BasemapPopup onClose={() => setActiveIndex(null)} />}

                {index === 2 && isActive && (
                  <AnalyticsDrawPopup onClose={() => setActiveIndex(null)} />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Tooltip
        id="left-sidebar-tooltip"
        place="right"
        offset={10}
        delayShow={250}
        className="!z-50 !rounded-md !bg-gray-900 !px-2.5 !py-1.5 !text-xs !font-medium !text-white !opacity-100 !shadow-lg"
      />
    </nav>
  );
}
