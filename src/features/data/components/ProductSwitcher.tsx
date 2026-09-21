import { FiPackage, FiChevronDown, FiLoader, FiX } from "react-icons/fi";
import React, { useState, useEffect, useRef } from "react";
import { useParameter } from "../hooks/useParameter";
import { useProductStore } from "../hooks/useproductStore";
import { listofproviderandsensors } from "./sidebar/api/product.service";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useAuthStore } from "../../../store/useAuthStore";
import { useMapSidebarStore } from "../hooks/useMapSidebarStore";
import { FaSatellite } from "react-icons/fa";

/* ── Provider icon map ──────────────────────────────── */
const PROVIDER_META: Record<string, { label: string; color: string; dot: string }> = {
  airbus: {
    label: "Airbus",
    color: "from-primary to-[#3d7d88]",
    dot: "bg-primary",
  },
  sentinel: {
    label: "Sentinel",
    color: "from-[#3d7d88] to-[#5a929b]",
    dot: "bg-[#3d7d88]",
  },
  planet: {
    label: "Planet",
    color: "from-[#245662] to-primary",
    dot: "bg-[#245662]",
  },
};

const providerMeta = (name: string) =>
  PROVIDER_META[name.toLowerCase()] ?? {
    label: name,
    color: "from-primary to-primary",
    dot: "bg-primary",
  };

const ProductSwitcher: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const { accessToken } = useAuthStore();
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const [openSensors, setOpenSensors] = useState<string[]>([]);

  const {
    providers,
    selectedProvider,
    selectedSensors,
    selectedProductTypes,
    setProviders,
    setSelectedProvider,
    setSelectedSensors,
    setSelectedProductTypes,
  } = useProductStore();

  const { tab, setTab } = useParameter();
  const activeIndex = useMapSidebarStore((state) => state.activeIndex);
  const isSidebarOpen = activeIndex !== null;
  const open = tab === "products";

  /* ── Local draft state for selections before applying ── */
  const [tempProvider, setTempProvider] = useState<string>(selectedProvider);
  const [tempSensors, setTempSensors] = useState<string[]>(selectedSensors);
  const [tempProductTypes, setTempProductTypes] = useState<string[]>(selectedProductTypes);

  const isInitialized = useProductStore((state) => state.isInitialized);
  const prevInitialized = useRef(isInitialized);

  // Sync temp state with global store whenever the modal opens
  useEffect(() => {
    if (open) {
      setTempProvider(selectedProvider);
      setTempSensors(selectedSensors);
      setTempProductTypes(selectedProductTypes);
    }
  }, [open]);

  // If providers load while modal is already open
  useEffect(() => {
    if (!prevInitialized.current && isInitialized && open) {
      prevInitialized.current = true;
      setTempProvider(selectedProvider);
      setTempSensors(selectedSensors);
      setTempProductTypes(selectedProductTypes);
    }
  }, [isInitialized, open, selectedProvider, selectedSensors, selectedProductTypes]);

  /* ── Derived: must be declared BEFORE anything that reads it ── */
  const currentProviderObj = providers.find((p) => p.name === tempProvider);

  type Sensor = NonNullable<typeof currentProviderObj>["sensors"][number];

  /* ── Dropdown (expand/collapse) helpers ── */
  const allDropdownsOpen =
    !!currentProviderObj?.sensors?.length &&
    currentProviderObj.sensors.every((sensor) => openSensors.includes(sensor.id));

  const toggleAllDropdowns = () => {
    if (!currentProviderObj?.sensors) return;

    if (allDropdownsOpen) {
      setOpenSensors([]);
    } else {
      setOpenSensors(currentProviderObj.sensors.map((sensor) => sensor.id));
    }
  };

  const toggleDropdown = (sensorId: string) => {
    setOpenSensors((prev) =>
      prev.includes(sensorId) ? [] : [sensorId],
    );
  };

  /* ── Data fetch ── */
  const fetchProviders = async () => {
    if (!token) return;
    setIsLoading(true);
    setFetchError(false);
    try {
      const response = await listofproviderandsensors();

      const encryptedPayload = response?.data ?? response;
      const decrypted = await decryptAESGCM(encryptedPayload, token);
      const parsed = typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;

      if (parsed?.success && Array.isArray(parsed.providers)) {
        setProviders(parsed.providers);
      } else {
        setFetchError(true);
      }
    } catch (error) {
      console.error("Error fetching providers/sensors:", error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Sensor helpers ── */
  const allSensorsSelected =
    !!currentProviderObj?.sensors?.length &&
    currentProviderObj.sensors.every((s) => tempSensors.includes(s.id));

  const toggleAllSensors = () => {
    if (!currentProviderObj?.sensors) return;

    const sensors = currentProviderObj.sensors;
    const sensorIds = sensors.map((sensor) => sensor.id);

    const allProductTypes = [...new Set(sensors.flatMap((sensor) => sensor.productTypes ?? []))];

    if (allSensorsSelected) {
      // Unselect all sensors + all their product types
      setTempSensors((prev) => prev.filter((id) => !sensorIds.includes(id)));
      setTempProductTypes((prev) => prev.filter((pt) => !allProductTypes.includes(pt)));
    } else {
      // Select all sensors + all product types
      setTempSensors((prev) => [...new Set([...prev, ...sensorIds])]);
      setTempProductTypes((prev) => [...new Set([...prev, ...allProductTypes])]);
    }
  };

  const handleProductTypeToggle = (sensor: Sensor, productType: string) => {
    const isSelected = tempProductTypes.includes(productType);

    const nextProductTypes = isSelected
      ? tempProductTypes.filter((pt) => pt !== productType)
      : [...tempProductTypes, productType];

    setTempProductTypes(nextProductTypes);

    const sensorProductTypes = sensor.productTypes ?? [];

    // Keep the sensor checked as long as one of its types is still selected.
    const hasSelectedProductType = sensorProductTypes.some((pt) => nextProductTypes.includes(pt));

    if (hasSelectedProductType) {
      if (!tempSensors.includes(sensor.id)) {
        setTempSensors((prev) => [...prev, sensor.id]);
      }
    } else {
      setTempSensors((prev) => prev.filter((id) => id !== sensor.id));
    }
  };

  const handleSensorToggle = (sensor: Sensor) => {
    const isSelected = tempSensors.includes(sensor.id);
    const productTypes = sensor.productTypes ?? [];

    if (isSelected) {
      // Unselect sensor + remove all its product types
      setTempSensors((prev) => prev.filter((id) => id !== sensor.id));
      setTempProductTypes((prev) => prev.filter((pt) => !productTypes.includes(pt)));
    } else {
      // Select sensor + select ALL its product types
      setTempSensors((prev) => [...prev, sensor.id]);
      setTempProductTypes((prev) => [...new Set([...prev, ...productTypes])]);
    }
  };

  const handleApply = () => {
    setSelectedProvider(tempProvider);
    setSelectedSensors(tempSensors);
    setSelectedProductTypes(tempProductTypes);
    setTab("none");
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSensors([]);
    setSelectedProductTypes([]);
    setTempSensors([]);
    setTempProductTypes([]);
    setTab("none");
  };

  /* ── Sensor short name for tab button display ── */
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

  const activeDisplayProvider = open ? tempProvider : selectedProvider;
  const activeDisplaySensors = open ? tempSensors : selectedSensors;
  const activeDisplayProductTypes = open ? tempProductTypes : selectedProductTypes;

  const displayProviderObj = providers.find((p) => p.name === activeDisplayProvider);
  const selectedDisplaySensorsList = (displayProviderObj?.sensors || []).filter((s) =>
    activeDisplaySensors.includes(s.id),
  );

  const hasSelectedSensors = selectedDisplaySensorsList.length > 0;

  const sensorLabels: string[] = [];

  selectedDisplaySensorsList.forEach((sensor) => {
    const baseName = getSensorShortName(sensor);
    const sensorProductTypes = sensor.productTypes ?? [];
    const selectedTypes = sensorProductTypes.filter((pt) =>
      activeDisplayProductTypes.includes(pt),
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

  const buttonLabel = hasSelectedSensors
    ? sensorLabels.join(", ")
    : "Products";

  return (
    <>
      <style>{`
        .ps-scroll::-webkit-scrollbar { width: 4px; }
        .ps-scroll::-webkit-scrollbar-track { background: transparent; }
        .ps-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
        .ps-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
        .ps-scroll { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
        @keyframes ps-fade-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .ps-panel { animation: ps-fade-in 0.18s ease; }
      `}</style>

      {/* ── Trigger button ── */}
      {hasSelectedSensors ? (
        <div
          onClick={() => setTab(open ? "none" : "products")}
          title={buttonLabel}
          className="border-primary bg-primary flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 select-none hover:bg-[#1f4e57]"
        >
          <FiPackage size={13} className="shrink-0 stroke-[2.5]" />
          <span className="max-w-[280px] truncate">{buttonLabel}</span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
            title="Clear Selected Products"
          >
            <FiX size={12} />
          </button>
          <FiChevronDown
            size={11}
            className={`shrink-0 stroke-[2.5] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTab(open ? "none" : "products")}
          title={buttonLabel}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer select-none ${
            open
              ? "border-primary bg-primary text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white"
          }`}
        >
          <FiPackage size={13} className="shrink-0 stroke-[2.5]" />
          <span>Products</span>
          <FiChevronDown
            size={11}
            className={`shrink-0 stroke-[2.5] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* ── Dropdown panel ── */}
      {open && (
        <>
          <div
            onClick={() => setTab("none")}
            className="fixed inset-0 z-[9998]"
          />
          <div
            className={`ps-panel fixed top-16 z-[100] flex flex-col w-[calc(100vw-32px)] max-w-[540px] max-h-[calc(100vh-90px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/25 transition-all duration-300 ${
              isSidebarOpen
                ? "left-1/2 lg:left-[calc((100%-615px)/2+32px)]"
                : "left-1/2"
            }`}
          >
            {/* Header gradient banner */}
            <div className="bg-primary shrink-0 px-4 sm:px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <FaSatellite size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm leading-tight font-bold text-white truncate">Satellite Products</h3>
                    <p className="mt-0.5 text-[11px] text-white/75 truncate">
                      Configure providers, sensors &amp; types
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("none")}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-base leading-none text-white transition-colors hover:bg-white/30"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 p-3.5 sm:p-4 overflow-y-auto ps-scroll flex-1">
              {/* ── Provider tabs ── */}
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Provider
                </p>
                {isLoading && providers.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                    <FiLoader size={12} className="animate-spin" />
                    Loading providers…
                  </div>
                ) : fetchError ? (
                  <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                    <span className="text-xs text-red-600">Failed to load providers.</span>
                    <button
                      onClick={fetchProviders}
                      className="text-xs font-semibold text-red-700 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                    {(providers || []).map((p) => {
                      const isActive = tempProvider === p.name;
                      const m = providerMeta(p.name);
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setTempProvider(p.name);
                            setOpenSensors([]);
                          }}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:py-2 text-xs font-semibold transition-all duration-200 ${
                            isActive
                              ? `bg-gradient-to-r ${m.color} text-white shadow-md`
                              : "text-slate-500 hover:bg-white hover:text-slate-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : m.dot}`}
                          />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Sensors ── */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Sensors
                    {currentProviderObj && (
                      <span className="bg-primary/10 text-primary ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                        {
                          currentProviderObj.sensors.filter((s) => tempSensors.includes(s.id))
                            .length
                        }
                        /{currentProviderObj.sensors.length}
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-3">
                    {currentProviderObj?.name?.toLowerCase() === "airbus" && (
                      <button
                        type="button"
                        onClick={toggleAllDropdowns}
                        className="hover:text-primary text-[11px] font-medium text-slate-500 transition-colors cursor-pointer"
                      >
                        {allDropdownsOpen ? "Close All" : "Open All"}
                      </button>
                    )}

                    <label className="hover:text-primary flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={allSensorsSelected}
                        onChange={toggleAllSensors}
                        className="accent-primary h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                      />
                      Select All
                    </label>
                  </div>
                </div>

                {isLoading && !currentProviderObj ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200/60" />
                    ))}
                  </div>
                ) : currentProviderObj?.sensors?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                    {currentProviderObj.sensors.map((sensor) => {
                      const checked = tempSensors.includes(sensor.id);
                      const isOpen = openSensors.includes(sensor.id);
                      return (
                        <div
                          key={sensor.id}
                          className={`border rounded-lg transition-all duration-150 overflow-hidden ${
                            checked
                              ? "border-primary/50 bg-primary/[0.04] shadow-2xs"
                              : "border-slate-200/80 bg-white"
                          }`}
                        >
                          {/* Sensor header */}
                          <div className="flex items-start gap-2.5 p-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleSensorToggle(sensor)}
                              className="accent-primary mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300"
                            />

                            <button
                              type="button"
                              onClick={() => toggleDropdown(sensor.id)}
                              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p
                                  className={`truncate text-[11px] leading-tight font-semibold ${
                                    checked ? "text-primary" : "text-slate-700"
                                  }`}
                                >
                                  {sensor.name}
                                </p>

                                <p className="mt-0.5 font-mono text-[9px] font-medium text-slate-400">
                                  {sensor.id}
                                </p>
                              </div>

                              {!!sensor.productTypes?.length && (
                                <FiChevronDown
                                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              )}
                            </button>
                          </div>

                          {/* Product type dropdown */}
                          {isOpen && !!sensor.productTypes?.length && (
                            <div className="border-t border-slate-200 bg-white px-2.5 py-2">
                              <p className="mb-1.5 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                                Product Type
                              </p>

                              <div className="space-y-1">
                                {sensor.productTypes.map((productType) => {
                                  const productChecked = tempProductTypes.includes(productType);

                                  return (
                                    <label
                                      key={productType}
                                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={productChecked}
                                        onChange={() => handleProductTypeToggle(sensor, productType)}
                                        className="accent-primary h-3 w-3 cursor-pointer rounded border-slate-300"
                                      />

                                      <span className="text-[10px] font-medium text-slate-600">
                                        {productType}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {isLoading ? "Loading…" : "No sensors available"}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 flex items-center justify-between border-t border-slate-200/80 bg-slate-50/90 px-4 py-3">
              <div className="text-xs text-slate-500 font-medium">
                {currentProviderObj ? (
                  <>
                    <span className="font-bold text-slate-700">
                      {currentProviderObj.sensors.filter((s) => tempSensors.includes(s.id)).length}
                    </span>
                    <span className="text-slate-400">/{currentProviderObj.sensors.length}</span> sensors selected
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("none")}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="bg-primary hover:bg-[#1f4e57] cursor-pointer rounded-lg px-5 py-1.5 text-xs font-bold text-white shadow-xs transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ProductSwitcher;
