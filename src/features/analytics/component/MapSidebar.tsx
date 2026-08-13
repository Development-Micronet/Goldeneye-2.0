import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import { RasterIcon } from "../../../assets";
import { AnalyticsMenu } from "./AnalyticsMenu";

interface MapSidebarProps {
  activeIndex?: number | null;
  setActiveIndex?: (index: number | null) => void;
}

export default function MapSidebar({
  activeIndex: propActiveIndex,
  setActiveIndex: propSetActiveIndex,
}: MapSidebarProps) {
  const [internalActive, setInternalActive] = useState<number | null>(null);

  const [expanded, setExpanded] = useState(false);

  const activeIndex = propActiveIndex !== undefined ? propActiveIndex : internalActive;

  const setActiveIndex = propSetActiveIndex || setInternalActive;
  const renderSheetContent = (index: number) => {
    switch (index) {
      case 0:
        return <AnalyticsMenu />;

      default:
        return null;
    }
  };
  const items = [
    {
      id: 0,
      name: "Raster",
      icon: RasterIcon,
      enabled: true,
    },
  ];

  const clickItem = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div
      className={`absolute top-0 right-0 z-50 h-full border-l border-gray-200 bg-white shadow-[-1px_0_16px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out ${expanded ? "w-[220px]" : "w-[60px]"} `}
    >
      {/* popup panel */}

      <div
        className={`absolute top-0 right-full flex h-full flex-col border-r border-gray-200 bg-white shadow-[-4px_0_24px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out ${
          activeIndex !== null ? "w-[500px] opacity-100" : "w-0 overflow-hidden opacity-0"
        } `}
      >
        {activeIndex !== null && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/60 px-5 py-3.5">
              <h3 className="truncate text-[13px] font-semibold tracking-tight text-gray-900">
                {items[activeIndex]?.name}
              </h3>

              <button
                onClick={() => setActiveIndex(null)}
                className="-mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors outline-none hover:bg-gray-200/70 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">{renderSheetContent(activeIndex)}</div>
          </>
        )}
      </div>

      {/* expand button */}

      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute top-1 -left-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors outline-none hover:border-gray-300 hover:bg-gray-50 hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500/40"
      >
        <ChevronRight
          className={`transition-transform duration-300 ease-out ${expanded ? "rotate-180" : ""} `}
          size={15}
        />
      </button>

      {/* menu */}

      <div className={`flex flex-col items-center gap-1 py-10 ${expanded ? "px-3" : "px-0"}`}>
        {items.map((item, index) => {
          const active = activeIndex === index;

          return (
            <button
              key={item.id}
              onClick={() => clickItem(index)}
              data-tooltip-id="map-sidebar-tooltip"
              data-tooltip-content={item.name}
              className={`group relative flex items-center rounded-lg transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                expanded ? "h-11 w-full gap-3 px-3" : "h-10 w-10 justify-center"
              } ${active ? "bg-teal-50 text-teal-800 ring-1 ring-teal-600/15" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"} `}
            >
              <img
                src={item.icon}
                className={`h-5 w-5 shrink-0 object-contain transition-opacity ${active ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
              />
              <span
                aria-hidden
                className={`absolute top-1/2 left-0 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-600 transition-all duration-200 ${active ? "h-5 opacity-100" : "h-0 opacity-0"}`}
              />

              {expanded && (
                <span className="truncate text-[13px] font-medium tracking-tight">{item.name}</span>
              )}
            </button>
          );
        })}
      </div>

      {!expanded && (
        <Tooltip
          id="map-sidebar-tooltip"
          place="left"
          offset={10}
          className="!rounded-md !bg-gray-900 !px-2.5 !py-1.5 !text-xs !font-medium !text-white !opacity-100 !shadow-lg"
        />
      )}
    </div>
  );
}
