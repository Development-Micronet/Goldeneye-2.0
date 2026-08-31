import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import React, { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import {
  advanceDataIcon,
  analyticsIcon,
  archiveIcon,
  indentIcon,
  mydataIcon,
  orbitIcon,
  orderIcon,
  taskingIcon,
} from "../../../assets";
import { useAuthStore } from "../../../store/useAuthStore";
import { AdvanceDataMenu } from "./sidebar/menus/AdvanceDataMenu";
import { ArchiveSearchMenu } from "./sidebar/menus/ArchiveSearchMenu";
import { MyDataMenu } from "./sidebar/menus/MyDataMenu";
import { MyIndentMenu } from "./sidebar/menus/MyIndentMenu";
import { MyOrderMenu } from "./sidebar/menus/MyOrderMenu";
import { OrbitographyMenu } from "./sidebar/menus/orbitography/OrbitographyMenu";
import { TaskingMenu } from "./sidebar/menus/TaskingMenu";
import { usePlanStore } from "../hooks/usePlanStore";

interface MapSidebarProps {
  activeIndex?: number | null;
  setActiveIndex?: (index: number | null) => void;
}

export default function MapSidebar({
  activeIndex: propActiveIndex,
  setActiveIndex: propSetActiveIndex,
}: MapSidebarProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const activeIndex = propActiveIndex !== undefined ? propActiveIndex : internalActiveIndex;
  const setActiveIndex = propSetActiveIndex || setInternalActiveIndex;
  const { user } = useAuthStore();
  const role = user?.roleName || "user";
  const plan = usePlanStore((state) => state.plan);
  const allowedServices = plan?.services ?? [];

  const roleIsSuperadmin = role === "superadmin";

  const hasOrbitography =
    roleIsSuperadmin || allowedServices.some((service) => service.toLowerCase() === "orbitography");

  const hasSearch =
    roleIsSuperadmin || allowedServices.some((service) => service.toLowerCase() === "search");

  const hasTasking = true; // Enabled by default, can be linked to api subscription check later

  const sidebarItems = [
    ...(hasSearch
      ? [
        {
          id: 1,
          icon: archiveIcon,
          tooltip: "Archive Search",
          status: true,
        },
      ]
      : []),
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
      icon: advanceDataIcon,
      tooltip: "Advance Data",
      status: false,
    },
    {
      id: 4,
      icon: mydataIcon,
      tooltip: "My Data",
      status: false,
    },
    {
      id: 5,
      icon: indentIcon,
      tooltip: "My Indent",
      status: true,
    },
    {
      id: 6,
      icon: orderIcon,
      tooltip: "My Order",
      status: true,
    },
    // {
    //   id: 7,
    //   icon: orbitIcon,
    //   tooltip: "Orbitography",
    //   status: true,
    // },
    ...(hasOrbitography
      ? [
        {
          id: 7,
          icon: orbitIcon,
          tooltip: "Orbitography",
          status: true,
        },
      ]
      : []),
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
        return <AdvanceDataMenu />;
      case 4:
        return <MyDataMenu />;
      case 5:
        return <MyIndentMenu />;
      case 6:
        return <MyOrderMenu />;
      case 7:
        return <OrbitographyMenu />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute top-0 right-0 z-40 flex h-full flex-col overflow-visible border-l border-gray-200 bg-white py-4 shadow-lg transition-all duration-300 ease-in-out sm:py-5 md:py-6 ${isExpanded ? "w-[180px] sm:w-[210px] md:w-[240px]" : "w-[50px] sm:w-[58px] md:w-[65px]"
        }`}
    >
      {/* Sliding Content Sheet */}
      <div
        className={`absolute top-0 z-30 flex h-full flex-col border-r border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-in-out ${activeIndex !== null
            ? "pointer-events-auto right-[50px] w-[calc(100vw-50px)] opacity-100 sm:right-full sm:w-[320px] md:w-[360px] lg:w-[550px]"
            : "pointer-events-none right-full w-0 overflow-hidden border-none opacity-0"
          }`}
      >
        {activeIndex !== null && (
          <>
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2 sm:py-3">
              <h3 className="text-primary max-w-[70%] truncate text-xs font-semibold sm:text-sm md:text-base">
                {filteredItems.find((item) => item.id - 1 === activeIndex)?.tooltip}
              </h3>
              <button
                onClick={() => setActiveIndex(null)}
                className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                aria-label="Close sheet"
              >
                <X className="h-4 h-5 w-4 md:w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-white">{renderSheetContent(activeIndex)}</div>
          </>
        )}
      </div>
      {/* Collapse/Expand toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="border-primary text-primary absolute top-3 -left-3 z-50 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border bg-white shadow-md transition-colors hover:bg-gray-50 focus:outline-none"
        aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <ChevronLeft
          className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Sidebar Items */}
      <ul className="flex w-full flex-1 flex-col items-center space-y-1 overflow-visible select-none">
        {filteredItems.map((item, index) => {
          const itemIndex = item.id - 1;
          const isActive = activeIndex === itemIndex;
          const isEnabled = item.status;

          return (
            <React.Fragment key={item.id}>
              <div className="relative flex w-full justify-center">
                <div className={`relative ${isExpanded ? "w-full" : "w-9 sm:w-11 md:w-12"}`}>
                  <button
                    onClick={() => handleItemClick(itemIndex, isEnabled)}
                    disabled={!isEnabled}
                    data-tooltip-id={isExpanded || isActive ? undefined : "sidebar-tooltip"}
                    data-tooltip-content={
                      isEnabled ? item.tooltip : `${item.tooltip} (Coming Soon)`
                    }
                    className={`relative flex items-center transition-all duration-200 focus:outline-none ${isExpanded
                        ? "h-11 w-full justify-start gap-2 px-3 text-left sm:h-12 sm:gap-3 sm:px-4 md:h-14 md:gap-4 md:px-6"
                        : "h-9 w-9 animate-none justify-center rounded-md sm:h-11 sm:w-11 sm:rounded-lg md:h-12 md:w-12"
                      } ${!isEnabled
                        ? "cursor-not-allowed text-gray-400 opacity-45"
                        : isActive
                          ? "bg-[#add3d3] text-black shadow-sm"
                          : "cursor-pointer text-gray-700 hover:bg-[#d5ebeb]"
                      }`}
                  >
                    <img
                      src={item.icon}
                      alt={item.tooltip}
                      className="h-5 w-5 flex-shrink-0 object-contain md:h-6 md:w-6"
                      loading="lazy"
                    />

                    {isExpanded && (
                      <span className="truncate text-[11px] font-medium sm:text-xs md:text-[13px]">
                        {item.tooltip}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Divider Line */}
              {index < filteredItems.length - 1 && (
                <div
                  className={`bg-primary/25 h-[1px] flex-shrink-0 transition-all duration-300 ${isExpanded
                      ? "my-1 w-[calc(100%-16px)] sm:my-1.5 sm:w-[calc(100%-24px)] md:w-[calc(100%-32px)]"
                      : "my-1 w-7 sm:w-9 md:w-10"
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
          className="z-50 !rounded !bg-gray-900 !px-2.5 !py-1.5 !text-xs !text-white !opacity-100 !shadow-lg"
        />
      )}
    </div>
  );
}
