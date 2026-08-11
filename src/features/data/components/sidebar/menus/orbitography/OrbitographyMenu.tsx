import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Radar, RefreshCw, Calendar, X, Loader2 } from "lucide-react";
import * as turf from "@turf/turf";

import { CalendarPopover } from "./CalendarPopover";
import { getBadgeStyle } from "./orbitographyUtils";
import { useAuthStore } from "../../../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../../../utils/dataDecrypt";
import { useLayersStore } from "../../../../../../store/useLayersStore";
import { useMapStore } from "../../../../store/useMapStore";
import { useSelectedAOIStore } from "../../../../hooks/useSelectedAOIStore";
import { fetchOrbits } from "../../api/orbitography.service";

export const OrbitographyMenu: React.FC = () => {
  // ─── STORES ───
  const layers = useLayersStore((state) => state.layers);
  const addLayer = useLayersStore((state) => state.addLayer);
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);

  // ─── REFS ───
  const containerRef = useRef<HTMLDivElement>(null);
  const satelliteDropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const searchRequestIdRef = useRef<number>(0);

  // ─── STATE VARIABLES ───
  const [aoi, setAoi] = useState("Worldwide");
  const [startDate, setStartDate] = useState("2026-08-08");
  const [endDate, setEndDate] = useState("2026-08-10");
  const [results, setResults] = useState<any[]>([]);
  const [debugMsg, setDebugMsg] = useState<string>("");
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [angle, setAngle] = useState<number>(30);
  const [selectedSatellites, setSelectedSatellites] = useState<string[]>(["PHR-1A", "PHR-1B", "SPOT-6"]);
  const [showSatelliteDropdown, setShowSatelliteDropdown] = useState(false);

  // ─── LIFE CYCLE EFFECTS ───
  // Close calendar and controls popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePicker(null);
      }
      if (satelliteDropdownRef.current && !satelliteDropdownRef.current.contains(event.target as Node)) {
        setShowSatelliteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, []);

  // Sync local AOI selection with the global selectedAOIId store
  useEffect(() => {
    if (selectedAOIId && layers.some((l) => l.id === selectedAOIId)) {
      setAoi(selectedAOIId);
    } else if (aoi !== "Worldwide" && aoi !== "India") {
      setAoi("Worldwide");
    }
  }, [selectedAOIId, layers]);


  // Trigger auto-search when the selected AOI, date range, satellites, or incidence angle changes
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [aoi, startDate, endDate, selectedSatellites, angle]);

  // ─── GEOSPATIAL / MAP HELPERS ───
  const handleLocateOrbit = (pass: any) => {
    const posList = pass.rawOrbit?.track?.posList;
    if (typeof posList !== "string") {
      const keys = pass.rawOrbit ? Object.keys(pass.rawOrbit).join(", ") : "null";
      console.warn(`Locate failed! No track coordinates. Orbit keys: ${keys}`);
      return;
    }

    const parts = posList.trim().split(/\s+/);
    const coords: [number, number][] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const lon = parseFloat(parts[i]);
      const lat = parseFloat(parts[i + 1]);
      if (!isNaN(lon) && !isNaN(lat)) {
        coords.push([lon, lat]);
      }
    }

    if (coords.length === 0) {
      console.warn("Locate failed! Coordinate parsing returned empty list.");
      return;
    }

    // Remove any existing orbit layers from store first so we don't pile up infinite orbit layers
    const state = useLayersStore.getState();
    const existingOrbitLayers = state.layers.filter(l => l.label.startsWith("Orbit:"));
    existingOrbitLayers.forEach(l => state.removeLayer(l.id));

    // 1. Add Swath Layer (Polygon with flat/sharp ends)
    try {
      const getSwathWidthKm = (angleVal: number) => {
        const altitude = 694.0; // standard altitude in km
        const rad = (angleVal * Math.PI) / 180.0;
        return 2.0 * altitude * Math.tan(rad);
      };

      const getFlatSwath = (trackCoords: [number, number][], widthKm: number) => {
        const leftCoords: [number, number][] = [];
        const rightCoords: [number, number][] = [];
        const halfWidth = widthKm / 2;

        for (let i = 0; i < trackCoords.length; i++) {
          const current = trackCoords[i];
          let heading = 0;

          if (i < trackCoords.length - 1) {
            heading = turf.bearing(turf.point(current), turf.point(trackCoords[i + 1]));
          } else if (i > 0) {
            heading = turf.bearing(turf.point(trackCoords[i - 1]), turf.point(current));
          }

          const leftHeading = (heading - 90 + 360) % 360;
          const rightHeading = (heading + 90) % 360;

          const leftPoint = turf.destination(turf.point(current), halfWidth, leftHeading, { units: "kilometers" });
          const rightPoint = turf.destination(turf.point(current), halfWidth, rightHeading, { units: "kilometers" });

          if (leftPoint.geometry && rightPoint.geometry) {
            leftCoords.push(leftPoint.geometry.coordinates as [number, number]);
            rightCoords.push(rightPoint.geometry.coordinates as [number, number]);
          }
        }

        const polygonCoords = [...leftCoords, ...rightCoords.reverse(), leftCoords[0]];
        return turf.polygon([polygonCoords]);
      };

      const swathWidth = getSwathWidthKm(angle);
      const flatSwathFeature = getFlatSwath(coords, swathWidth);

      if (flatSwathFeature && flatSwathFeature.geometry) {
        addLayer({
          label: `Orbit: ${pass.name} (${pass.time}) Swath`,
          type: "Polygon",
          geojson: {
            type: "Feature",
            properties: {},
            geometry: flatSwathFeature.geometry
          },
          visible: true
        });
      }
    } catch (turfErr) {
      console.error("Turf swath buffer generation failed:", turfErr);
    }

    // 2. Add Track Centerline Layer (Polyline)
    addLayer({
      label: `Orbit: ${pass.name} (${pass.time}) Track`,
      type: "Polyline",
      geojson: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords
        }
      },
      visible: true
    });
  };

  const handleClearOrbit = () => {
    const state = useLayersStore.getState();
    const existingOrbitLayers = state.layers.filter(l => l.label.startsWith("Orbit:"));
    existingOrbitLayers.forEach(l => state.removeLayer(l.id));
  };

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Open picker, toggle it closed if clicked again
  const openPicker = (type: "start" | "end") => {
    if (activePicker === type) {
      setActivePicker(null);
      return;
    }
    setActivePicker(type);
  };

  // Handle date selection from popover
  const handleDateSelect = (dateStr: string) => {
    if (activePicker === "start") {
      setStartDate(dateStr);
    } else {
      setEndDate(dateStr);
    }
    setActivePicker(null);
  };

  // ─── SEARCH ACTIONS ───
  const handleSearch = async () => {
    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    // Don't clear previous results on subsequent searches to allow overlay loader
    if (results.length === 0) {
      setHasSearched(false);
    }
    setDebugMsg("Starting API call...");

    const selectedLayer = layers.find((l) => l.id === aoi);

    const formattedStart = startDate
      ? `${startDate}T00:00:00${selectedLayer ? ".000Z" : ""}`
      : `2025-07-13T00:00:00${selectedLayer ? ".000Z" : ""}`;
    const formattedEnd = endDate
      ? `${endDate}T23:59:59${selectedLayer ? ".000Z" : ""}`
      : `2025-07-15T23:59:59${selectedLayer ? ".000Z" : ""}`;

    try {
      const payload: any = {
        satellites: selectedSatellites,
        startDate: formattedStart,
        endDate: formattedEnd,
        mode: "DESCENDING",
        angle: angle
      };

      if (selectedLayer && selectedLayer.geojson && selectedLayer.geojson.geometry) {
        payload.shape = selectedLayer.geojson.geometry;
      }

      const response = await fetchOrbits(payload, Boolean(selectedLayer));
      if (requestId !== searchRequestIdRef.current) return;

      setDebugMsg("API call finished. Parsing...");

      let data = response.data;
      if (data && typeof data === "object" && "data" in data && typeof (data as any).data === "string") {
        data = (data as any).data;
      }
      setDebugMsg(`Data type: ${typeof data}. Length: ${typeof data === "string" ? data.length : "N/A"}`);
      if (typeof data === "string") {
        try {
          const state = useAuthStore.getState();
          const token = state.accessToken?.replace("Bearer ", "").trim() || "";
          setDebugMsg(`Decrypting with token length: ${token.length}...`);
          const decrypted = await decryptAESGCM(data, token);
          if (requestId !== searchRequestIdRef.current) return;

          setDebugMsg("Decryption success!");
          data = typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
        } catch (decErr: any) {
          if (requestId !== searchRequestIdRef.current) return;
          console.error("Failed to decrypt API response:", decErr);
          setDebugMsg(`Decryption failed: ${decErr?.message || decErr}`);
        }
      }

      if (requestId !== searchRequestIdRef.current) return;
      console.log("Orbitography API parsed data:", data);

      const formatApiDate = (isoStr: string) => {
        if (!isoStr) return "";
        const datePart = isoStr.split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}-${month}-${year}`;
        }
        return datePart;
      };

      const formatApiTime = (isoStr: string) => {
        if (!isoStr) return "";
        const timePart = isoStr.split("T")[1];
        if (!timePart) return "";
        const parts = timePart.split(":");
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }
        return timePart;
      };

      const orbitData: any[] = [];
      if (data && Array.isArray(data.results)) {
        data.results.forEach((satItem: any, satIndex: number) => {
          const satelliteName = satItem.satellite || satItem.name || "";
          if (Array.isArray(satItem.orbits)) {
            satItem.orbits.forEach((orbit: any, orbitIndex: number) => {
              const startStr = orbit.period?.start || orbit.period?.startDate || orbit.startTime || "";
              const endStr = orbit.period?.end || orbit.period?.endDate || orbit.endTime || "";

              const dateStr = startStr ? formatApiDate(startStr) : "";
              const timeStr = (startStr && endStr)
                ? `${formatApiTime(startStr)} - ${formatApiTime(endStr)}`
                : "";

              orbitData.push({
                id: `orbit-${satIndex}-${orbitIndex}-${orbitData.length}`,
                name: satelliteName,
                date: dateStr,
                time: timeStr,
                _rawStart: startStr,
                rawOrbit: orbit,
              });
            });
          }
        });
      }

      // Sort chronologically by start time
      orbitData.sort((a, b) => (a._rawStart || "").localeCompare(b._rawStart || ""));
      setDebugMsg("");
      setResults(orbitData);
      setHasSearched(true);
    } catch (error: any) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error("API Error fetching orbits:", error);
      setDebugMsg(`API error: ${error?.message || error}`);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // ─── RENDERING ───
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Search configuration section */}
      <div className="flex flex-col gap-4 border-b border-gray-100 p-4 pb-5">
        {/* AOI Selector */}
        <div className="flex flex-col gap-1.5 font-sans">
          <label className="text-xs font-semibold text-gray-700">AOI</label>
          <div className="relative">
            <select
              value={aoi}
              onChange={(e) => {
                const val = e.target.value;
                setAoi(val);
                if (val !== "Worldwide" && val !== "India") {
                  setSelectedAOI(val);
                } else {
                  setSelectedAOI(null);
                }
              }}
              className="w-full appearance-none rounded-md border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 transition outline-none hover:border-gray-300 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
            >
              <option value="Worldwide">Worldwide</option>
              {layers
                .filter((layer) => !layer.label.startsWith("Orbit:"))
                .map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.label} ({layer.type})
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="relative flex flex-col gap-1.5" ref={containerRef}>
          <label className="text-xs font-semibold text-gray-700 font-sans">Date Range</label>
          <div className="flex items-center gap-2">
            {/* Start Date Field */}
            <div
              onClick={() => openPicker("start")}
              className={`flex flex-1 items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-800 cursor-pointer select-none transition-colors ${activePicker === "start" ? "border-gray-300" : "border-gray-200"
                }`}
            >
              <span className="font-sans">{startDate ? formatDateForInput(startDate) : "Select date"}</span>
              <div className="flex items-center gap-1">
                {startDate && activePicker === "start" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartDate("");
                    }}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                    title="Clear date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <span className="text-xs font-medium text-gray-400 font-sans">To</span>

            {/* End Date Field */}
            <div
              onClick={() => openPicker("end")}
              className={`flex flex-1 items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-800 cursor-pointer select-none transition-colors ${activePicker === "end" ? "border-gray-300" : "border-gray-200"
                }`}
            >
              <span className="font-sans">{endDate ? formatDateForInput(endDate) : "Select date"}</span>
              <div className="flex items-center gap-1">
                {endDate && activePicker === "end" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEndDate("");
                    }}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                    title="Clear date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Floating Custom Calendar Popover */}
          {activePicker && (
            <CalendarPopover
              startDate={startDate}
              endDate={endDate}
              activePicker={activePicker}
              onSelectDate={handleDateSelect}
            />
          )}
        </div>

        {/* Satellite Selector */}
        <div className="relative flex flex-col gap-1.5 font-sans" ref={satelliteDropdownRef}>
          <label className="text-xs font-semibold text-gray-700">Satellite</label>
          <div
            onClick={() => setShowSatelliteDropdown(!showSatelliteDropdown)}
            className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 cursor-pointer select-none hover:border-gray-300"
          >
            <span className="truncate text-xs">
              {selectedSatellites.length === 0 ? "Select Satellites" : selectedSatellites.join(", ")}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          {showSatelliteDropdown && (
            <div className="absolute top-[105%] left-0 z-50 w-full rounded-md border border-gray-200 bg-white p-3 shadow-lg flex flex-col gap-2">
              {["PHR-1A", "PHR-1B", "SPOT-6", "PNEO3", "PNEO4"].map((sat) => {
                const isChecked = selectedSatellites.includes(sat);
                return (
                  <label
                    key={sat}
                    className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedSatellites(selectedSatellites.filter((s) => s !== sat));
                        } else {
                          setSelectedSatellites([...selectedSatellites, sat]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600 accent-cyan-600"
                    />
                    <span>{sat}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Incidence Angle Selector */}
        <div className="flex flex-col gap-2 font-sans mt-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-700">Incidence Angle</label>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              Angle: {angle}°
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] font-semibold text-gray-400 min-w-[24px]">Max 50°</span>
          </div>
        </div>
      </div>

      {/* Welcome Screen / Placeholder (before search) */}
      {!hasSearched && !isSearching && (
        <div className="flex-1 flex flex-col items-center justify-start pt-16 p-6 text-center select-none bg-white font-sans">
          {/* Concentric Radar/Orbit Icon */}
          <div className="mb-6 text-gray-200">
            <svg
              className="mx-auto h-24 w-24"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* Outer dotted/dashed circle */}
              <circle cx="50" cy="50" r="36" strokeDasharray="3 3" className="text-gray-300" />
              {/* Middle circle */}
              <circle cx="50" cy="50" r="24" className="text-gray-300" />
              {/* Inner circle */}
              <circle cx="50" cy="50" r="12" className="text-gray-300" />
              {/* Center point */}
              <circle cx="50" cy="50" r="2" fill="currentColor" className="text-gray-300" />
              {/* Outer orbit path lines / markers */}
              <circle cx="50" cy="50" r="44" strokeWidth="0.75" className="text-gray-200" strokeDasharray="1 8" />
            </svg>
          </div>

          <h2 className="mb-2 text-base font-bold text-gray-800">Welcome to Orbitography</h2>

          <p className="mb-6 max-w-[250px] text-xs leading-relaxed text-gray-500">
            Please choose your search criteria and launch the orbitography research
          </p>

          <button
            onClick={handleSearch}
            className="rounded bg-[#106070] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4e5c] focus:outline-none shadow-sm"
          >
            Search
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isSearching && results.length === 0 && (
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2.5"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-5 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-12 bg-gray-200 rounded"></div>
                <div className="h-4.5 w-24 bg-gray-200 rounded flex-1"></div>
              </div>
              <div className="h-7 w-7 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Results Header & Scrollable List */}
      {hasSearched && (results.length > 0 || !isSearching) && (
        <>
          <div className="flex flex-col border-b border-gray-100 bg-gray-50/50 px-4 py-3 font-sans gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">Showing {results.length} results</span>
              <button
                title="Refresh results"
                onClick={handleSearch}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSearching ? "animate-spin text-cyan-600" : ""}`} />
              </button>
            </div>
            {debugMsg &&
              (debugMsg.toLowerCase().includes("fail") ||
                debugMsg.toLowerCase().includes("error") ||
                debugMsg.toLowerCase().includes("success") ||
                debugMsg.toLowerCase().includes("locate")) && (
                <div className="text-[10px] font-mono text-red-600 bg-red-50 p-1.5 rounded border border-red-100 break-all select-text">
                  {debugMsg}
                </div>
              )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 font-sans relative">
            <div className="flex flex-col gap-2">
              {results.map((pass) => (
                <div
                  key={pass.id}
                  onMouseEnter={() => handleLocateOrbit(pass)}
                  onMouseLeave={handleClearOrbit}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 transition hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Constellation Badge */}
                    <span className={getBadgeStyle(pass.name)}>{pass.name}</span>
                    {/* Date */}
                    <span className="text-[11px] font-medium text-gray-500 sm:text-xs font-sans">{pass.date}</span>
                    {/* Time Range */}
                    <span className="text-[11px] font-medium text-gray-500 sm:text-xs font-sans">{pass.time}</span>
                  </div>

                  {/* Decorative Icon */}
                  <div
                    title="Hover to show on map"
                    className="rounded-full border border-gray-100 bg-white p-1 text-gray-400 shadow-sm transition hover:bg-cyan-50 hover:text-cyan-700"
                  >
                    <Radar className="h-3.5 w-3.5 animate-none" />
                  </div>
                </div>
              ))}
            </div>
            {isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1.5px] z-50 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-[#106070]" />
                <span className="mt-2 text-xs font-semibold text-gray-600">Updating orbits...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
