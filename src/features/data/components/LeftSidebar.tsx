import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import React, { useEffect, useRef, useState } from "react";
import { drawIcon, importIcon, selectIcon, RasterIcon } from "../../../assets";
import { useMapStore } from "../store/useMapStore";
import DrawPopup from "./sidebar/DrawPopup";
import ImportPopup from "./sidebar/ImportPopup";
import SelectPopup from "./sidebar/SelectPopup";
import RasterPopup from "./sidebar/RasterPopup";

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
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
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
      className="absolute top-0 left-0 z-40 flex h-fit w-[50px] flex-col border border-gray-400 bg-white py-3 shadow-lg transition-all duration-300 ease-in-out sm:w-[58px] md:w-[65px]"
    >
      <ul className="flex w-full flex-1 flex-col items-center space-y-1 overflow-visible select-none">
        {sidebarItems.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <React.Fragment key={item.id}>
              <div className="relative flex w-full justify-center">
                <div className="relative w-9 sm:w-11 md:w-12">
                  <button
                    onClick={() => handleItemClick(index)}
                    data-tooltip-id={isActive ? undefined : "left-sidebar-tooltip"}
                    data-tooltip-content={item.tooltip}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 focus:outline-none sm:h-11 sm:w-11 sm:rounded-lg md:h-12 md:w-12 ${isActive
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "hover:bg-primary/10 cursor-pointer text-gray-700"
                      }`}
                  >
                    <img
                      src={item.icon}
                      alt={item.tooltip}
                      className="h-4 w-4 flex-shrink-0 object-contain md:h-4.5 md:w-4.5"
                      loading="lazy"
                    />
                  </button>

                  {/* Draw Option Modal/Popup */}
                  {index === 0 && isActive && <DrawPopup onClose={() => setActiveIndex(null)} />}

                  {/* Import Option Modal/Popup */}
                  {index === 1 && isActive && <ImportPopup onClose={() => setActiveIndex(null)} />}

                  {/* Select Option Modal/Popup */}
                  {index === 2 && isActive && <SelectPopup onClose={() => setActiveIndex(null)} />}


                  {/* {index === 3 && isActive && <RasterPopup onClose={() => setActiveIndex(null)} />} */}
                </div>
              </div>

              {/* Divider Line */}
              {index < sidebarItems.length - 1 && (
                <div className="bg-primary/25 my-1 h-[1px] w-7 flex-shrink-0 transition-all duration-300 sm:w-9 md:w-10" />
              )}
            </React.Fragment>
          );
        })}
      </ul>

      {/* Tooltip Provider */}
      <Tooltip
        id="left-sidebar-tooltip"
        place="right"
        className="z-50 !rounded !bg-gray-900 !px-2.5 !py-1.5 !text-xs !text-white !opacity-100 !shadow-lg"
      />
    </div>
  );
}
