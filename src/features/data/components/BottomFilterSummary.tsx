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

  /* ── Sensor short name for display (matching ProductSwitcher) ── */
  const getSensorShortName = (sensor: { id: string; name?: string }) => {
    const idUpper = (sensor.id || "").toUpperCase();
    const nameLower = (sensor.name || "").toLowerCase();

    // Airbus specific mappings:
    // Pleiades Neo (0.3m) -> "0.3m"
    if (idUpper === "PNEO" || nameLower.includes("neo") || nameLower.includes("0.3")) {
      return "0.3m";
    }
    // Pleiades (0.5m) -> "0.5m"
    if (
      idUpper === "PHR" ||
      nameLower.includes("0.5") ||
      (nameLower.includes("pleiades") && !nameLower.includes("neo"))
    ) {
      return "0.5m";
    }
    // DMC -> "DMC"
    if (idUpper === "DMC" || nameLower.includes("dmc")) {
      return "DMC";
    }
    // Spot -> "Spot"
    if (idUpper === "SPOT" || nameLower.includes("spot")) {
      return "Spot";
    }

    // Fallback: Check if name has resolution in parentheses e.g. "(0.3m)"
    const match = sensor.name?.match(/\(([\d.]+)m?\)/i);
    if (match) {
      return `${match[1]}m`;
    }

    return sensor.name || sensor.id;
  };

  /* ── Product type sub-label extractor (e.g. "Pleiades-0.5m-MONO" -> "mono") ── */
  const getProductTypeSubName = (productType: string): string => {
    const val = (productType || "").toLowerCase().trim();
    if (val.includes("tristereo")) return "tristereo";
    if (val.includes("stereo")) return "stereo";
    if (val.includes("mono")) return "mono";
    if (val.includes("dsm")) return "dsm";
    if (val.includes("dem")) return "dem";
    if (val.includes("ortho")) return "ortho";

    const parts = productType.split(/[-_]/);
    return (parts[parts.length - 1] || productType).trim().toLowerCase();
  };

  const getProductsText = () => {
    const currentProviderObj = providers.find((p) => p.name === selectedProvider);
    if (!currentProviderObj) {
      return "0.3m, 0.5m, DMC, Spot";
    }

    const selectedSensorsList = (currentProviderObj.sensors || []).filter((s) =>
      selectedSensors.includes(s.id),
    );

    if (selectedSensorsList.length === 0) {
      return "None";
    }

    const sensorLabels: string[] = [];

    selectedSensorsList.forEach((sensor) => {
      const baseName = getSensorShortName(sensor);
      const sensorProductTypes = sensor.productTypes ?? [];
      const selectedTypes = sensorProductTypes.filter((pt) =>
        selectedProductTypes.includes(pt),
      );

      if (sensorProductTypes.length === 0) {
        // Sensor has no product types (e.g. DMC, Spot)
        sensorLabels.push(baseName);
      } else if (
        selectedTypes.length > 0 &&
        selectedTypes.length < sensorProductTypes.length
      ) {
        // Specific subset of product types selected (e.g. mono or stereo)
        selectedTypes.forEach((pt) => {
          const sub = getProductTypeSubName(pt);
          const isSpot =
            sensor.id?.toUpperCase() === "SPOT" ||
            (sensor.name || "").toLowerCase().includes("spot");
          const prefix = isSpot ? "1.5m" : baseName;
          sensorLabels.push(`${prefix}-${sub}`);
        });
      } else {
        // All product types selected for this sensor (or default)
        sensorLabels.push(baseName);
      }
    });

    return sensorLabels.length > 0 ? sensorLabels.join(", ") : "None";
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
  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center">
      <div
        className={`pointer-events-auto relative w-full bg-[#f0f9fa]/95 backdrop-blur-md border-t border-primary/20 px-4 py-[1.5px] shadow-lg select-none transition-transform duration-300 ease-in-out ${
          isCollapsed ? "translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Toggle Button: slides with the footer while staying visible to toggle open/close */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute right-4 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#235863] text-white shadow-md transition-all duration-300 hover:bg-[#1a444c] hover:scale-110 border border-white/40 ${
            isCollapsed ? "-top-7" : "-top-3"
          }`}
          title={isCollapsed ? "Show filter summary" : "Hide filter summary"}
        >
          {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <div className="flex items-center justify-between gap-4 pr-10 text-[10px] sm:text-[11px] text-gray-700">
          <div className="flex flex-col gap-0.5 min-w-0">
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
            </div>
          </div>

          {/* Right side: Copyright */}
          <div className="shrink-0 text-gray-600 font-medium text-[10px] sm:text-[11px] select-none text-right">
            © Micronet {currentYear}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomFilterSummary;
