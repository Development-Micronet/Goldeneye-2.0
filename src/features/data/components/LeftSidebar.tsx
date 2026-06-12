import React, { useState, useEffect, useRef } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { drawIcon, importIcon, selectIcon } from "../../../assets";
import { useMapStore } from "../store/useMapStore";
import DrawPopup from "./sidebar/DrawPopup";
import ImportPopup from "./sidebar/ImportPopup";
import SelectPopup from "./sidebar/SelectPopup";

interface LeftSidebarProps {
  activeIndex?: number | null;
  setActiveIndex?: (index: number | null) => void;
}

export default function LeftSidebar({
  activeIndex: propActiveIndex,
  setActiveIndex: propSetActiveIndex,
}: LeftSidebarProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(
    null,
  );

  const activeIndex =
    propActiveIndex !== undefined ? propActiveIndex : internalActiveIndex;
  const setActiveIndex = propSetActiveIndex || setInternalActiveIndex;

  const { resetMapState } = useMapStore();

  useEffect(() => {
    // Only reset map state if we are switching to another open menu item.
    // Do NOT reset if activeIndex becomes null (which happens when selecting a tool and closing the popup).
    if (activeIndex !== null) {
      resetMapState();
    }
  }, [activeIndex, resetMapState]);

  const sidebarItems = [
    {
      id: 1,
      icon: drawIcon,
      tooltip: "Draw",
    },
    {
      id: 2,
      icon: importIcon,
      tooltip: "Import",
    },
    {
      id: 3,
      icon: selectIcon,
      tooltip: "Select",
    },
  ];

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setActiveIndex(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setActiveIndex]);

  const handleItemClick = (index: number) => {
    if (activeIndex === index) {
      setActiveIndex(null);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div
      ref={sidebarRef}
      className="absolute top-0 left-0 h-fit bg-white border border-gray-400 z-40 shadow-lg flex flex-col py-3 transition-all duration-300 ease-in-out w-[50px] sm:w-[58px] md:w-[65px]"
    >
      <ul className="flex flex-col items-center w-full select-none overflow-visible flex-1 space-y-1">
        {sidebarItems.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <React.Fragment key={item.id}>
              <div className="relative w-full flex justify-center">
                <div className="relative w-9 sm:w-11 md:w-12">
                  <button
                    onClick={() => handleItemClick(index)}
                    data-tooltip-id={
                      isActive ? undefined : "left-sidebar-tooltip"
                    }
                    data-tooltip-content={item.tooltip}
                    className={`flex items-center justify-center transition-all duration-200 relative focus:outline-none w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-md sm:rounded-lg ${
                      isActive
                        ? "bg-primary/20 text-primary shadow-sm"
                        : "hover:bg-primary/10 text-gray-700 cursor-pointer"
                    }`}
                  >
                    <img
                      src={item.icon}
                      alt={item.tooltip}
                      className="w-4 h-4 md:w-4.5 md:h-4.5 object-contain flex-shrink-0"
                      loading="lazy"
                    />
                  </button>

                  {/* Draw Option Modal/Popup */}
                  {index === 0 && isActive && (
                    <DrawPopup onClose={() => setActiveIndex(null)} />
                  )}

                  {/* Import Option Modal/Popup */}
                  {index === 1 && isActive && (
                    <ImportPopup onClose={() => setActiveIndex(null)} />
                  )}

                  {/* Select Option Modal/Popup */}
                  {index === 2 && isActive && (
                    <SelectPopup onClose={() => setActiveIndex(null)} />
                  )}
                </div>
              </div>

              {/* Divider Line */}
              {index < sidebarItems.length - 1 && (
                <div className="h-[1px] bg-primary/25 flex-shrink-0 transition-all duration-300 w-7 sm:w-9 md:w-10 my-1" />
              )}
            </React.Fragment>
          );
        })}
      </ul>

      {/* Tooltip Provider */}
      <Tooltip
        id="left-sidebar-tooltip"
        place="right"
        className="z-50 !bg-gray-900 !text-white !text-xs !px-2.5 !py-1.5 !rounded !shadow-lg !opacity-100"
      />
    </div>
  );
}
