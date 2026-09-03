import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useParameter } from "../hooks/useParameter";
import { useProductStore } from "../hooks/useproductStore";

export const BottomFilterSummary: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { cloudcover, incidentAngle, dateMode, startDate, endDate } = useParameter();
  const { providers, selectedProvider, selectedSensors, selectedProductTypes } = useProductStore();

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = months[monthIndex] || month;
      const dayPadded = day.padStart(2, "0");
      return `${dayPadded} ${monthName} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayNum = String(d.getDate()).padStart(2, "0");
    const monthName = d.toLocaleString("en-US", { month: "short" });
    const yearNum = d.getFullYear();
    return `${dayNum} ${monthName} ${yearNum}`;
  };

  const getProductsText = () => {
    const currentProviderObj = providers.find((p) => p.name === selectedProvider);
    if (!currentProviderObj) {
      return "PNEO, DMC, SPOT, PHR, Elevation";
    }

    // Get active main sensors (PNEO, DMC, SPOT, PHR)
    const activeSensors = currentProviderObj.sensors
      .filter((s) => selectedSensors.includes(s.id))
      .map((s) => s.name || s.id.toUpperCase());

    // Check if Elevation / DSM / DEM is selected
    const hasElevation = selectedProductTypes.some((t) =>
      ["elevation", "dsm", "dem", "32m", "22m"].includes(t.toLowerCase()),
    );

    const titles: string[] = [];

    // Maintain consistent order: PNEO, DMC, SPOT, PHR, Elevation
    const standardOrder = ["PNEO", "DMC", "SPOT", "PHR"];
    standardOrder.forEach((name) => {
      if (activeSensors.some((s) => s.toUpperCase().includes(name))) {
        titles.push(name);
      }
    });

    // Add any other active sensor names not in standard list
    activeSensors.forEach((s) => {
      const upper = s.toUpperCase();
      if (!standardOrder.some((name) => upper.includes(name)) && !titles.includes(s)) {
        titles.push(s);
      }
    });

    if (hasElevation && !titles.includes("Elevation")) {
      titles.push("Elevation");
    }

    if (titles.length === 0) return "None";
    return titles.join(", ");
  };

  const getCloudCoverText = () => {
    try {
      const range = Array.isArray(cloudcover)
        ? cloudcover
        : JSON.parse(cloudcover || "[0,100]");
      return `${range[0]}% - ${range[1]}%`;
    } catch {
      return "0% - 100%";
    }
  };

  const getIncidenceAngleText = () => {
    try {
      const range = Array.isArray(incidentAngle)
        ? incidentAngle
        : JSON.parse(incidentAngle || "[0,60]");
      return `${range[0]}° - ${range[1]}°`;
    } catch {
      return "0° - 60%";
    }
  };

  const getDateText = () => {
    if (dateMode === "after" && startDate) {
      return `After ${formatDisplayDate(startDate)}`;
    }
    if (dateMode === "before" && (startDate || endDate)) {
      return `Before ${formatDisplayDate(startDate || endDate)}`;
    }
    if (dateMode === "between" && startDate && endDate) {
      return `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;
    }
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;
    }
    if (startDate || endDate) {
      return `${formatDisplayDate(startDate || endDate)}`;
    }
    return "All";
  };

  const isAirbus = selectedProvider === "airbus";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center">
      <div className="pointer-events-auto relative w-full bg-[#f0f9fa]/95 backdrop-blur-md border-t border-primary/20 px-4 py-1 sm:py-1.5 shadow-lg transition-all duration-300 select-none">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#235863] text-white shadow-md transition hover:bg-[#1a444c]"
          title={isCollapsed ? "Expand summary" : "Collapse summary"}
        >
          {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {!isCollapsed ? (
          <div className="flex flex-col gap-0.5 pr-8 text-[10px] sm:text-[11px] text-gray-700">
            {/* Top row: Products (Airbus only) */}
            {isAirbus && (
              <>
                <div className="flex items-center gap-1.5 font-medium leading-tight">
                  <span className="text-gray-800 font-semibold">Products:</span>
                  <span className="text-gray-600">{getProductsText()}</span>
                </div>

                {/* Divider */}
                <div className="w-full border-t border-primary/20 my-0.5" />
              </>
            )}

            {/* Bottom row: Filter specs with separators */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-gray-800 font-semibold">Cloud Cover:</span>
                <span className="text-gray-600">{getCloudCoverText()}</span>
              </div>
              <span className="text-gray-400 font-light">|</span>

              <div className="flex items-center gap-1">
                <span className="text-gray-800 font-semibold">Inc. Angle:</span>
                <span className="text-gray-600">{getIncidenceAngleText()}</span>
              </div>
              <span className="text-gray-400 font-light">|</span>

              <div className="flex items-center gap-1">
                <span className="text-gray-800 font-semibold">Date:</span>
                <span className="text-gray-600">{getDateText()}</span>
              </div>
              <span className="text-gray-400 font-light">|</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pr-8 text-[10px] sm:text-[11px] text-gray-600 leading-tight">
            {isAirbus && (
              <>
                <span>
                  <strong className="text-gray-800 font-semibold">Products:</strong> {getProductsText()}
                </span>
                <span className="text-gray-400 font-light">|</span>
              </>
            )}
            <span>
              <strong className="text-gray-800 font-semibold">Cloud:</strong> {getCloudCoverText()}
            </span>
            <span className="text-gray-400 font-light">|</span>
            <span>
              <strong className="text-gray-800 font-semibold">Angle:</strong> {getIncidenceAngleText()}
            </span>
            <span className="text-gray-400 font-light">|</span>
            <span>
              <strong className="text-gray-800 font-semibold">Date:</strong> {getDateText()}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default BottomFilterSummary;
