import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Radar, RefreshCw, Calendar, X, Loader2 } from "lucide-react";
import * as turf from "@turf/turf";

import { CalendarPopover } from "./CalendarPopover";
import { getBadgeStyle } from "./orbitographyUtils";
import { useAuthStore } from "../../../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../../../utils/dataDecrypt";
import { useLayersStore } from "../../../../../../store/useLayersStore";
import { useSelectedAOIStore } from "../../../../hooks/useSelectedAOIStore";
import { fetchOrbits } from "../../api/orbitography.service";

export const OrbitographyMenu: React.FC = () => {
  // =========================================================
  // STORES
  // =========================================================

  const layers = useLayersStore((state) => state.layers);
  const addLayer = useLayersStore((state) => state.addLayer);

  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);

  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);

  // =========================================================
  // CONSTANTS
  // =========================================================

  const SATELLITE_OPTIONS = ["PHR-1A", "PHR-1B", "SPOT-6", "PNEO3", "PNEO4"];

  // =========================================================
  // REFS
  // =========================================================

  const containerRef = useRef<HTMLDivElement>(null);
  const satelliteDropdownRef = useRef<HTMLDivElement>(null);

  const isMountedRef = useRef(false);

  const searchRequestIdRef = useRef<number>(0);

  // Important:
  // First successful search par sirf ek baar first 5
  // results automatically select honge.
  // const firstFiveAutoSelectedRef = useRef(false);

  // =========================================================
  // STATE
  // =========================================================

  const [aoi, setAoi] = useState("Worldwide");

  const [startDate, setStartDate] = useState("2026-08-08");

  const [endDate, setEndDate] = useState("2026-08-10");

  const [results, setResults] = useState<any[]>([]);

  const [debugMsg, setDebugMsg] = useState("");

  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);

  const [hasSearched, setHasSearched] = useState(false);

  const [isSearching, setIsSearching] = useState(false);

  const [angle, setAngle] = useState<number>(30);

  // Initially ALL 5 satellites selected
  const [selectedSatellites, setSelectedSatellites] = useState<string[]>(SATELLITE_OPTIONS);

  const [showSatelliteDropdown, setShowSatelliteDropdown] = useState(false);

  // Which orbit result checkboxes are selected
  const [visiblePassIds, setVisiblePassIds] = useState<string[]>([]);

  // =========================================================
  // OUTSIDE CLICK
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (containerRef.current && !containerRef.current.contains(target)) {
        setActivePicker(null);
      }

      if (satelliteDropdownRef.current && !satelliteDropdownRef.current.contains(target)) {
        setShowSatelliteDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, []);

  // =========================================================
  // SYNC AOI
  // =========================================================

  useEffect(() => {
    if (selectedAOIId && layers.some((layer) => layer.id === selectedAOIId)) {
      setAoi(selectedAOIId);
    } else if (aoi !== "Worldwide" && aoi !== "India") {
      setAoi("Worldwide");
    }
  }, [selectedAOIId, layers]);

  // =========================================================
  // AUTO SEARCH
  // =========================================================

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

  // =========================================================
  // CLEAR ALL ORBIT LAYERS
  // =========================================================

  const clearAllOrbitLayers = () => {
    const state = useLayersStore.getState();

    const orbitLayers = state.layers.filter((layer) => layer.label.startsWith("Orbit:"));

    orbitLayers.forEach((layer) => {
      state.removeLayer(layer.id);
    });
  };

  // =========================================================
  // CLEAR SINGLE ORBIT
  // =========================================================

  const handleClearOrbit = (pass: any) => {
    const state = useLayersStore.getState();

    const prefix = `Orbit: ${pass.id}`;

    const existingOrbitLayers = state.layers.filter((layer) => layer.label.startsWith(prefix));

    existingOrbitLayers.forEach((layer) => {
      state.removeLayer(layer.id);
    });
  };

  // =========================================================
  // GET ORBIT COORDINATES
  // =========================================================

  const getOrbitCoordinates = (pass: any): [number, number][] | null => {
    const posList = pass.rawOrbit?.track?.posList;

    if (typeof posList !== "string") {
      const keys = pass.rawOrbit ? Object.keys(pass.rawOrbit).join(", ") : "null";

      console.warn(`Locate failed! No track coordinates. Orbit keys: ${keys}`);

      return null;
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

      return null;
    }

    return coords;
  };

  // =========================================================
  // CREATE SWATH
  // =========================================================

  const createSwath = (trackCoords: [number, number][], angleValue: number) => {
    const altitude = 694.0;

    const rad = (angleValue * Math.PI) / 180;

    const swathWidthKm = 2.0 * altitude * Math.tan(rad);

    const halfWidth = swathWidthKm / 2;

    const leftCoords: [number, number][] = [];

    const rightCoords: [number, number][] = [];

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

      const leftPoint = turf.destination(turf.point(current), halfWidth, leftHeading, {
        units: "kilometers",
      });

      const rightPoint = turf.destination(turf.point(current), halfWidth, rightHeading, {
        units: "kilometers",
      });

      if (leftPoint.geometry && rightPoint.geometry) {
        leftCoords.push(leftPoint.geometry.coordinates as [number, number]);

        rightCoords.push(rightPoint.geometry.coordinates as [number, number]);
      }
    }

    if (leftCoords.length < 2 || rightCoords.length < 2) {
      return null;
    }

    const polygonCoords = [...leftCoords, ...rightCoords.reverse(), leftCoords[0]];

    return turf.polygon([polygonCoords]);
  };

  // =========================================================
  // SHOW ORBIT ON MAP
  // =========================================================

  const handleLocateOrbit = (pass: any) => {
    const coords = getOrbitCoordinates(pass);

    if (!coords) {
      return;
    }

    // IMPORTANT:
    // Yahan ALL orbit layers remove nahi karne hain.
    // Isliye multiple checked orbits ek saath map par rahenge.

    try {
      const swathFeature = createSwath(coords, angle);

      if (swathFeature && swathFeature.geometry) {
        addLayer({
          label: `Orbit: ${pass.id} Swath`,
          type: "Polygon",
          geojson: {
            type: "Feature",
            properties: {
              orbitId: pass.id,
              satellite: pass.name,
            },
            geometry: swathFeature.geometry,
          },
          visible: true,
        });
      }
    } catch (error) {
      console.error("Turf swath generation failed:", error);
    }

    // Track
    addLayer({
      label: `Orbit: ${pass.id} Track`,
      type: "Polyline",
      geojson: {
        type: "Feature",
        properties: {
          orbitId: pass.id,
          satellite: pass.name,
        },
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
      visible: true,
    });
  };

  // =========================================================
  // CHECK / UNCHECK ORBIT
  // =========================================================

  const handlePassCheckbox = (pass: any) => {
    const isCurrentlyVisible = visiblePassIds.includes(pass.id);

    if (isCurrentlyVisible) {
      // -----------------------------------------
      // UNCHECK
      // -----------------------------------------

      setVisiblePassIds((prev) => prev.filter((id) => id !== pass.id));

      // Sirf current orbit remove hoga
      handleClearOrbit(pass);
    } else {
      // -----------------------------------------
      // CHECK
      // -----------------------------------------

      setVisiblePassIds((prev) => [...prev, pass.id]);

      // Current orbit map par show karo
      handleLocateOrbit(pass);
    }
  };

  // =========================================================
  // SATELLITE SELECTION
  // =========================================================

  const handleSatelliteChange = (satellite: string) => {
    const isSelected = selectedSatellites.includes(satellite);

    if (isSelected) {
      // Remove satellite
      setSelectedSatellites((prev) => prev.filter((sat) => sat !== satellite));

      // Is satellite ke selected passes find karo
      const passesToRemove = results.filter(
        (pass) => pass.name === satellite && visiblePassIds.includes(pass.id),
      );

      // Map layers remove karo
      passesToRemove.forEach((pass) => {
        handleClearOrbit(pass);
      });

      // Visible IDs bhi remove karo
      setVisiblePassIds((prev) =>
        prev.filter((id) => !passesToRemove.some((pass) => pass.id === id)),
      );
    } else {
      // Add satellite
      setSelectedSatellites((prev) => [...prev, satellite]);
    }
  };

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) {
      return "";
    }

    const [year, month, day] = dateStr.split("-");

    return `${day}/${month}/${year}`;
  };

  // =========================================================
  // DATE PICKER
  // =========================================================

  const openPicker = (type: "start" | "end") => {
    if (activePicker === type) {
      setActivePicker(null);
      return;
    }

    setActivePicker(type);
  };

  const handleDateSelect = (dateStr: string) => {
    if (activePicker === "start") {
      setStartDate(dateStr);
    } else if (activePicker === "end") {
      setEndDate(dateStr);
    }

    setActivePicker(null);
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = async () => {
    const requestId = ++searchRequestIdRef.current;

    setIsSearching(true);
    const selectedLayer = layers.find((layer) => layer.id === aoi);

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
        angle,
      };

      if (selectedLayer && selectedLayer.geojson && selectedLayer.geojson.geometry) {
        payload.shape = selectedLayer.geojson.geometry;
      }

      const response = await fetchOrbits(payload, Boolean(selectedLayer));

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setDebugMsg("API call finished. Parsing...");

      let data = response.data;

      // =====================================================
      // RESPONSE WRAPPER
      // =====================================================

      if (
        data &&
        typeof data === "object" &&
        "data" in data &&
        typeof (data as any).data === "string"
      ) {
        data = (data as any).data;
      }

      // =====================================================
      // DECRYPT
      // =====================================================

      if (typeof data === "string") {
        try {
          const state = useAuthStore.getState();

          const token = state.accessToken?.replace("Bearer ", "").trim() || "";

          const decrypted = await decryptAESGCM(data, token);

          if (requestId !== searchRequestIdRef.current) {
            return;
          }

          data = typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
        } catch (decErr: any) {
          console.error("Failed to decrypt API response:", decErr);

          setDebugMsg(`Decryption failed: ${decErr?.message || decErr}`);

          return;
        }
      }

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      console.log("Orbitography API parsed data:", data);

      // =====================================================
      // FORMATTERS
      // =====================================================

      const formatApiDate = (isoStr: string) => {
        if (!isoStr) {
          return "";
        }

        const datePart = isoStr.split("T")[0];

        const parts = datePart.split("-");

        if (parts.length === 3) {
          const [year, month, day] = parts;

          return `${day}-${month}-${year}`;
        }

        return datePart;
      };

      const formatApiTime = (isoStr: string) => {
        if (!isoStr) {
          return "";
        }

        const timePart = isoStr.split("T")[1];

        if (!timePart) {
          return "";
        }

        const parts = timePart.split(":");

        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }

        return timePart;
      };

      // =====================================================
      // CREATE ORBIT DATA
      // =====================================================

      const orbitData: any[] = [];

      if (data && Array.isArray(data.results)) {
        data.results.forEach((satItem: any, satIndex: number) => {
          const satelliteName = satItem.satellite || satItem.name || "";

          if (Array.isArray(satItem.orbits)) {
            satItem.orbits.forEach((orbit: any, orbitIndex: number) => {
              const startStr =
                orbit.period?.start || orbit.period?.startDate || orbit.startTime || "";

              const endStr = orbit.period?.end || orbit.period?.endDate || orbit.endTime || "";

              const dateStr = startStr ? formatApiDate(startStr) : "";

              const timeStr =
                startStr && endStr ? `${formatApiTime(startStr)} - ${formatApiTime(endStr)}` : "";

              orbitData.push({
                id: `orbit-${satIndex}-${orbitIndex}-${Date.now()}-${orbitData.length}`,

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

      // =====================================================
      // SORT
      // =====================================================

      orbitData.sort((a, b) => (a._rawStart || "").localeCompare(b._rawStart || ""));

      // =====================================================
      // REMOVE OLD MAP ORBITS
      // =====================================================

      clearAllOrbitLayers();

      // Old selected IDs clear
      setVisiblePassIds([]);

      // =====================================================
      // SET RESULTS
      // =====================================================

      setResults(orbitData);

      setHasSearched(true);

      setDebugMsg("");

      // =====================================================
      // FIRST SEARCH -> AUTO SELECT FIRST 5
      // =====================================================

      // if (
      //   !firstFiveAutoSelectedRef.current &&
      //   orbitData.length > 0
      // ) {
      //   const firstFive =
      //     orbitData.slice(0, 5);

      //   const firstFiveIds =
      //     firstFive.map(
      //       (pass) => pass.id
      //     );

      //   // Checkbox selected
      //   setVisiblePassIds(
      //     firstFiveIds
      //   );

      //   // Map par first 5 show
      //   firstFive.forEach((pass) => {
      //     handleLocateOrbit(pass);
      //   });

      //   // Important:
      //   // Ab dobara auto-select nahi hoga
      //   firstFiveAutoSelectedRef.current =
      //     true;
      // }
    } catch (error: any) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      console.error("API Error fetching orbits:", error);

      setDebugMsg(`API error: ${error?.message || error}`);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // =========================================================
  // DISPLAY RESULTS
  // =========================================================

  const displayedResults = results.filter((pass) => selectedSatellites.includes(pass.name));

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* =====================================================
          SEARCH CONFIGURATION
      ====================================================== */}

      <div className="flex flex-col gap-4 border-b border-gray-100 p-4 pb-5">
        {/* AOI */}

        <div className="flex flex-col gap-1.5 font-sans">
          <label className="text-xs font-semibold text-gray-700">AOI</label>

          <div className="relative">
            <select
              value={aoi}
              onChange={(e) => {
                const value = e.target.value;

                setAoi(value);

                if (value !== "Worldwide" && value !== "India") {
                  setSelectedAOI(value);
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

            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* DATE */}

        <div className="relative flex flex-col gap-1.5" ref={containerRef}>
          <label className="font-sans text-xs font-semibold text-gray-700">Date Range</label>

          <div className="flex items-center gap-2">
            {/* START */}

            <div
              onClick={() => openPicker("start")}
              className={`flex flex-1 cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-800 select-none ${
                activePicker === "start" ? "border-gray-300" : "border-gray-200"
              }`}
            >
              <span>{startDate ? formatDateForInput(startDate) : "Select date"}</span>

              <div className="flex items-center gap-1">
                {startDate && activePicker === "start" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartDate("");
                    }}
                    className="mr-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <span className="font-sans text-xs font-medium text-gray-400">To</span>

            {/* END */}

            <div
              onClick={() => openPicker("end")}
              className={`flex flex-1 cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-800 select-none ${
                activePicker === "end" ? "border-gray-300" : "border-gray-200"
              }`}
            >
              <span>{endDate ? formatDateForInput(endDate) : "Select date"}</span>

              <div className="flex items-center gap-1">
                {endDate && activePicker === "end" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEndDate("");
                    }}
                    className="mr-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {activePicker && (
            <CalendarPopover
              startDate={startDate}
              endDate={endDate}
              activePicker={activePicker}
              onSelectDate={handleDateSelect}
            />
          )}
        </div>

        {/* =====================================================
            SATELLITE
        ====================================================== */}

        <div className="relative flex flex-col gap-1.5 font-sans" ref={satelliteDropdownRef}>
          <label className="text-xs font-semibold text-gray-700">Satellite</label>

          <div
            onClick={() => setShowSatelliteDropdown((prev) => !prev)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none hover:border-gray-300"
          >
            <span className="truncate text-xs">
              {selectedSatellites.length === SATELLITE_OPTIONS.length
                ? "All 5 satellites"
                : selectedSatellites.length === 0
                  ? "Select Satellites"
                  : selectedSatellites.join(", ")}
            </span>

            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>

          {showSatelliteDropdown && (
            <div className="absolute top-[105%] left-0 z-50 flex w-full flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
              {SATELLITE_OPTIONS.map((satellite) => {
                const checked = selectedSatellites.includes(satellite);

                return (
                  <label
                    key={satellite}
                    className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-gray-700 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleSatelliteChange(satellite)}
                      className="h-4 w-4 rounded border-gray-300 accent-cyan-600"
                    />

                    <span>{satellite}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* =====================================================
            INCIDENCE ANGLE
        ====================================================== */}

        <div className="mt-1 flex flex-col gap-2 font-sans">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">Incidence Angle</label>

            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-500"
            />

            <span className="min-w-[45px] text-[10px] font-semibold text-gray-400">Max 50°</span>
          </div>
        </div>
      </div>

      {/* =====================================================
          WELCOME
      ====================================================== */}

      {!hasSearched && !isSearching && (
        <div className="flex flex-1 flex-col items-center justify-start bg-white p-6 pt-16 text-center font-sans">
          <div className="mb-6 text-gray-200">
            <svg
              className="mx-auto h-24 w-24"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="50" cy="50" r="36" strokeDasharray="3 3" className="text-gray-300" />

              <circle cx="50" cy="50" r="24" className="text-gray-300" />

              <circle cx="50" cy="50" r="12" className="text-gray-300" />

              <circle cx="50" cy="50" r="2" fill="currentColor" className="text-gray-300" />

              <circle
                cx="50"
                cy="50"
                r="44"
                strokeWidth="0.75"
                className="text-gray-200"
                strokeDasharray="1 8"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-base font-bold text-gray-800">Welcome to Orbitography</h2>

          <p className="mb-6 max-w-[250px] text-xs leading-relaxed text-gray-500">
            Please choose your search criteria and launch the orbitography research
          </p>

          <button
            onClick={handleSearch}
            className="rounded bg-[#106070] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e5c]"
          >
            Search
          </button>
        </div>
      )}

      {/* =====================================================
          LOADING
      ====================================================== */}

      {isSearching && results.length === 0 && (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2.5"
            >
              <div className="flex w-full items-center gap-4">
                <div className="h-5 w-5 rounded bg-gray-200" />

                <div className="h-5 w-16 rounded bg-gray-200" />

                <div className="h-4 w-20 rounded bg-gray-200" />

                <div className="h-4 flex-1 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =====================================================
          RESULTS
      ====================================================== */}

      {hasSearched && (results.length > 0 || !isSearching) && (
        <>
          {/* RESULTS HEADER */}

          <div className="flex flex-col gap-1.5 border-b border-gray-100 bg-gray-50/50 px-4 py-3 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-800">
                  Showing {displayedResults.length} results
                </span>

                {visiblePassIds.length > 0 && (
                  <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                    Selected: {visiblePassIds.length}
                  </span>
                )}
              </div>

              <button
                title="Refresh results"
                onClick={handleSearch}
                className="rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSearching ? "animate-spin text-cyan-600" : ""}`}
                />
              </button>
            </div>

            {debugMsg && (
              <div className="rounded border border-red-100 bg-red-50 p-1.5 font-mono text-[10px] break-all text-red-600">
                {debugMsg}
              </div>
            )}
          </div>

          {/* =================================================
                RESULT LIST
            ================================================= */}

          <div className="relative flex-1 overflow-y-auto px-4 py-3 font-sans">
            <div className="flex flex-col gap-2">
              {displayedResults.map((pass) => {
                const isChecked = visiblePassIds.includes(pass.id);

                return (
                  <div
                    key={pass.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition ${
                      isChecked
                        ? "border-cyan-200 bg-cyan-50/40"
                        : "border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                    }`}
                  >
                    {/* CHECKBOX */}

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePassCheckbox(pass)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-cyan-600"
                    />

                    {/* INFO */}

                    <div className="flex flex-1 items-center gap-4 px-3">
                      <span className={getBadgeStyle(pass.name)}>{pass.name}</span>

                      <span className="text-[11px] font-medium text-gray-500 sm:text-xs">
                        {pass.date}
                      </span>

                      <span className="text-[11px] font-medium text-gray-500 sm:text-xs">
                        {pass.time}
                      </span>
                    </div>

                    {/* RADAR */}

                    <button
                      type="button"
                      title={isChecked ? "Hide orbit" : "Show orbit"}
                      onClick={() => handlePassCheckbox(pass)}
                      className={`rounded-full border p-1 shadow-sm transition ${
                        isChecked
                          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                          : "border-gray-100 bg-white text-gray-400 hover:bg-cyan-50 hover:text-cyan-700"
                      }`}
                    >
                      <Radar className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* =================================================
                    SELECTED DETAILS
                ================================================= */}

              {/* {visiblePassIds.length >
                  0 && (
                    <div className="mt-4 border-t pt-3">

                      <h3 className="mb-2 text-sm font-semibold text-gray-800">
                        Selected Orbits
                      </h3>

                      <div className="space-y-1">
                        {results
                          .filter((pass) =>
                            visiblePassIds.includes(
                              pass.id
                            )
                          )
                          .map((pass) => (
                            <div
                              key={pass.id}
                              className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5 text-xs"
                            >
                              <span className="font-medium">
                                {pass.name}
                              </span>

                              <span className="text-gray-500">
                                {pass.date}{" "}
                                {pass.time}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )} */}
            </div>

            {/* UPDATE LOADER */}

            {isSearching && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1.5px]">
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
