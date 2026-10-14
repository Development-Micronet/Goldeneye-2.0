import { useMemo, useState } from "react";
import { ChevronRight, Loader2, X } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import { RasterIcon, HistoryIcon } from "../../../assets";
import {
  isActive,
  SERVICE_BY_NAME,
  STAGE_LABEL,
} from "../../../constant/Analytics.config";

import { AnalyticsMenu } from "./AnalyticsMenu";
import History from "./History";
import { usePredictionStore } from "../utils/Usepredictions";


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
  const predictions = usePredictionStore((state) => state.predictions);
  const abort = usePredictionStore((state) => state.abort);
  const activePredictions = useMemo(
    () => predictions.filter((item) => isActive(item.status)),
    [predictions],
  );
  const renderSheetContent = (index: number) => {
    switch (index) {
      case 0:
        return <AnalyticsMenu />;
      case 1:
        return <History />;
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
    {
      id: 1,
      name: "Historical Archive",
      icon: HistoryIcon,
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
        className={`absolute top-0 right-full flex h-full flex-col border-r border-gray-200 bg-white shadow-[-4px_0_24px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out ${activeIndex !== null ? "w-[500px] opacity-100" : "w-0 overflow-hidden opacity-0"
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
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">{renderSheetContent(activeIndex)}</div>
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
              className={`group relative flex items-center rounded-lg transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${expanded ? "h-11 w-full gap-3 px-3" : "h-10 w-10 justify-center"
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

        {/* Loading models below Historical Archive when sidebar is closed and models are running */}
        {activeIndex === null && activePredictions.length > 0 && (
          <div className={`flex flex-col gap-1.5 w-full ${expanded ? "mt-1.5 px-0" : "items-center mt-1.5"}`}>
            {activePredictions.map((pred) => {
              const service = SERVICE_BY_NAME.get(pred.serviceName);
              const label = service?.label ?? pred.serviceName;
              const Icon = service?.icon;
              const stage = STAGE_LABEL[pred.status] ?? "Running";
              const progressPct = pred.progress > 0 ? `${Math.round(pred.progress)}%` : "";
              const tooltipContent = `${label}: ${stage}${progressPct ? ` (${progressPct})` : ""}`;

              return (
                <button
                  key={pred.id}
                  onClick={() => setActiveIndex(0)}
                  data-tooltip-id="map-sidebar-tooltip"
                  data-tooltip-content={tooltipContent}
                  className={`group relative flex items-center rounded-lg border border-teal-200/90 bg-teal-50/80 text-teal-800 transition-all duration-150 outline-none hover:bg-teal-100/90 hover:border-teal-300 focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                    expanded ? "h-12 w-full gap-2.5 px-3" : "h-10 w-10 justify-center"
                  }`}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    {Icon ? (
                      <>
                        <Icon className="h-4 w-4 text-teal-700" />
                        <Loader2 className="absolute -top-1.5 -right-1.5 h-3 w-3 animate-spin text-teal-600" />
                      </>
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                    )}
                  </div>

                  <span
                    aria-hidden
                    className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-600 opacity-70"
                  />

                  {expanded && (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
                        <span className="w-full truncate text-[12px] font-semibold text-teal-900">
                          {label}
                        </span>
                        <span className="w-full truncate text-[10px] text-teal-600">
                          {stage} {progressPct ? `· ${progressPct}` : ""}
                        </span>
                      </div>

                      <div
                        role="button"
                        title={`Cancel ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          abort(pred.id);
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-teal-700/70 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
