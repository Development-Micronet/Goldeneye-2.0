import React, { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  archiveIcon,
  taskingIcon,
  analyticsIcon,
  advanceDataIcon,
  mydataIcon,
  indentIcon,
  orderIcon,
  orbitIcon,
} from "../../../assets";

import { ArchiveSearchMenu } from "./sidebar/menus/ArchiveSearchMenu";
import { TaskingMenu } from "./sidebar/menus/TaskingMenu";
import { AnalyticsMenu } from "./sidebar/menus/AnalyticsMenu";
import { AdvanceDataMenu } from "./sidebar/menus/AdvanceDataMenu";
import { MyDataMenu } from "./sidebar/menus/MyDataMenu";
import { MyIndentMenu } from "./sidebar/menus/MyIndentMenu";
import { MyOrderMenu } from "./sidebar/menus/MyOrderMenu";
import { OrbitographyMenu } from "./sidebar/menus/OrbitographyMenu";

interface MapSidebarProps {
  activeIndex?: number | null;
  setActiveIndex?: (index: number | null) => void;
}

export default function MapSidebar({
  activeIndex: propActiveIndex,
  setActiveIndex: propSetActiveIndex,
}: MapSidebarProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const activeIndex =
    propActiveIndex !== undefined ? propActiveIndex : internalActiveIndex;
  const setActiveIndex = propSetActiveIndex || setInternalActiveIndex;

  const { user } = useAuthStore();
  const role = user?.roleName || "user";
  const hasTasking = true; // Enabled by default, can be linked to api subscription check later

  const sidebarItems = [
    {
      id: 1,
      icon: archiveIcon,
      tooltip: "Archive Search",
      status: true,
    },
    ...(hasTasking
      ? [
          {
            id: 2,
            icon: taskingIcon,
            tooltip: "Tasking",
            status: true,
          },
        ]
      : []),
    {
      id: 3,
      icon: analyticsIcon,
      tooltip: "Analytics",
      status: true,
    },
    {
      id: 4,
      icon: advanceDataIcon,
      tooltip: "Advance Data",
      status: false,
    },
    {
      id: 5,
      icon: mydataIcon,
      tooltip: "My Data",
      status: false,
    },
    {
      id: 6,
      icon: indentIcon,
      tooltip: "My Indent",
      status: true,
    },
    {
      id: 7,
      icon: orderIcon,
      tooltip: "My Order",
      status: true,
    },
    {
      id: 8,
      icon: orbitIcon,
      tooltip: "Orbitography",
      status: false,
    },
  ];

  // Filter out ID 6 (My Indent) for superadmin role (business rule from Phase 2)
  const filteredItems = sidebarItems.filter((item) =>
    role.toLowerCase() === "superadmin" ? item.id !== 6 : true,
  );

  const handleItemClick = (index: number, status: boolean) => {
    if (!status) return; // Disable clicking for coming soon items
    if (activeIndex === index) {
      setActiveIndex(null);
    } else {
      setActiveIndex(index);
    }
  };

  const renderSheetContent = (index: number) => {
    const item = filteredItems.find((it) => it.id - 1 === index);
    if (!item) return null;

    switch (item.id) {
      case 1:
        return <ArchiveSearchMenu />;
      case 2:
        return <TaskingMenu />;
      case 3:
        return <AnalyticsMenu />;
      case 4:
        return <AdvanceDataMenu />;
      case 5:
        return <MyDataMenu />;
      case 6:
        return <MyIndentMenu />;
      case 7:
        return <MyOrderMenu />;
      case 8:
        return <OrbitographyMenu />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute top-0 right-0 h-full bg-white border-l border-gray-200 z-40 shadow-lg flex flex-col py-4 sm:py-5 md:py-6 transition-all duration-300 ease-in-out overflow-visible ${
        isExpanded
          ? "w-[180px] sm:w-[210px] md:w-[240px]"
          : "w-[50px] sm:w-[58px] md:w-[65px]"
      }`}
    >
      {/* Sliding Content Sheet */}
      <div
        className={`absolute top-0 h-full bg-white shadow-2xl border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          activeIndex !== null
            ? "right-[50px] sm:right-full w-[calc(100vw-50px)] sm:w-[320px] md:w-[360px] lg:w-[600px] opacity-100 pointer-events-auto"
            : "right-full w-0 opacity-0 pointer-events-none overflow-hidden border-none"
        }`}
      >
        {activeIndex !== null && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-primary truncate max-w-[70%]">
                {filteredItems.find((item) => item.id - 1 === activeIndex)?.tooltip}
              </h3>
              <button
                onClick={() => setActiveIndex(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer "
                aria-label="Close sheet"
              >
                <X className="w-4 h-4 md:w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-white">
              {renderSheetContent(activeIndex)}
            </div>
          </>
        )}
      </div>
      {/* Collapse/Expand toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-5 h-5 rounded-full bg-white border border-primary flex items-center justify-center text-primary absolute top-3 -left-3 shadow-md hover:bg-gray-50 transition-colors cursor-pointer z-50 focus:outline-none"
        aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <ChevronLeft
          className={`h-4 w-4 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Sidebar Items */}
      <ul className="flex flex-col items-center w-full select-none overflow-visible flex-1 space-y-1">
        {filteredItems.map((item, index) => {
          const itemIndex = item.id - 1;
          const isActive = activeIndex === itemIndex;
          const isEnabled = item.status;

          return (
            <React.Fragment key={item.id}>
              <div className="relative w-full flex justify-center">
                <div className={`relative ${isExpanded ? "w-full" : "w-9 sm:w-11 md:w-12"}`}>
                  <button
                    onClick={() => handleItemClick(itemIndex, isEnabled)}
                    disabled={!isEnabled}
                    data-tooltip-id={isExpanded || isActive ? undefined : "sidebar-tooltip"}
                    data-tooltip-content={isEnabled ? item.tooltip : `${item.tooltip} (Coming Soon)`}
                    className={`flex items-center transition-all duration-200 relative focus:outline-none ${
                      isExpanded
                        ? "w-full h-11 sm:h-12 md:h-14 px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-4 text-left justify-start"
                        : "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-md sm:rounded-lg justify-center animate-none"
                    } ${
                      !isEnabled
                        ? "opacity-45 cursor-not-allowed text-gray-400"
                        : isActive
                          ? "bg-[#add3d3] text-black shadow-sm"
                          : "hover:bg-[#d5ebeb] text-gray-700 cursor-pointer"
                    }`}
                  >
                    <img
                      src={item.icon}
                      alt={item.tooltip}
                      className="w-5 h-5 md:w-6 md:h-6 object-contain flex-shrink-0"
                      loading="lazy"
                    />

                    {isExpanded && (
                      <span className="text-[11px] sm:text-xs md:text-[13px] font-medium truncate">
                        {item.tooltip}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Divider Line */}
              {index < filteredItems.length - 1 && (
                <div
                  className={`h-[1px] bg-primary/25 flex-shrink-0 transition-all duration-300 ${
                    isExpanded
                      ? "w-[calc(100%-16px)] sm:w-[calc(100%-24px)] md:w-[calc(100%-32px)] my-1 sm:my-1.5"
                      : "w-7 sm:w-9 md:w-10 my-1"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ul>

      {/* Tooltip Provider */}
      {!isExpanded && (
        <Tooltip
          id="sidebar-tooltip"
          place="left"
          className="z-50 !bg-gray-900 !text-white !text-xs !px-2.5 !py-1.5 !rounded !shadow-lg !opacity-100"
        />
      )}
    </div>
  );
}
