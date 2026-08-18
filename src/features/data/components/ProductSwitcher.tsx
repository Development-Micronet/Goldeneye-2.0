import { FiPackage, FiChevronDown, FiLoader } from "react-icons/fi";
import React, { useState, useEffect } from "react";
import { useParameter } from "../hooks/useParameter";
import { useProductStore } from "../hooks/useproductStore";
import { listofproviderandsensors } from "./sidebar/api/product.service";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useAuthStore } from "../../../store/useAuthStore";
import { FaSatellite } from "react-icons/fa";

/* ── Provider icon map ──────────────────────────────── */
const PROVIDER_META: Record<
  string,
  { label: string; color: string; dot: string }
> = {
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
  const open = tab === "products";

  /* ── Derived: must be declared BEFORE anything that reads it ── */
  const currentProviderObj = providers.find((p) => p.name === selectedProvider);

  type Sensor = NonNullable<typeof currentProviderObj>["sensors"][number];

  /* ── Dropdown (expand/collapse) helpers ── */
  const allDropdownsOpen =
    !!currentProviderObj?.sensors?.length &&
    currentProviderObj.sensors.every((sensor) =>
      openSensors.includes(sensor.id)
    );

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
      prev.includes(sensorId)
        ? prev.filter((id) => id !== sensorId)
        : [...prev, sensorId]
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
      const parsed =
        typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;

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
    currentProviderObj.sensors.every((s) => selectedSensors.includes(s.id));

  const toggleAllSensors = () => {
    if (!currentProviderObj?.sensors) return;

    const sensors = currentProviderObj.sensors;
    const sensorIds = sensors.map((sensor) => sensor.id);

    const allProductTypes = [
      ...new Set(sensors.flatMap((sensor) => sensor.productTypes ?? [])),
    ];

    if (allSensorsSelected) {
      // Unselect all sensors + all their product types
      setSelectedSensors(
        selectedSensors.filter((id) => !sensorIds.includes(id))
      );

      setSelectedProductTypes(
        selectedProductTypes.filter((pt) => !allProductTypes.includes(pt))
      );
    } else {
      // Select all sensors + all product types
      setSelectedSensors([...new Set([...selectedSensors, ...sensorIds])]);

      setSelectedProductTypes([
        ...new Set([...selectedProductTypes, ...allProductTypes]),
      ]);
    }
  };

  const handleProductTypeToggle = (sensor: Sensor, productType: string) => {
    const isSelected = selectedProductTypes.includes(productType);

    const nextProductTypes = isSelected
      ? selectedProductTypes.filter((pt) => pt !== productType)
      : [...selectedProductTypes, productType];

    setSelectedProductTypes(nextProductTypes);

    const sensorProductTypes = sensor.productTypes ?? [];

    // Keep the sensor checked as long as one of its types is still selected.
    const hasSelectedProductType = sensorProductTypes.some((pt) =>
      nextProductTypes.includes(pt)
    );

    if (hasSelectedProductType) {
      if (!selectedSensors.includes(sensor.id)) {
        setSelectedSensors([...selectedSensors, sensor.id]);
      }
    } else {
      setSelectedSensors(selectedSensors.filter((id) => id !== sensor.id));
    }
  };

  const handleSensorToggle = (sensor: Sensor) => {
    const isSelected = selectedSensors.includes(sensor.id);
    const productTypes = sensor.productTypes ?? [];

    if (isSelected) {
      // Unselect sensor + remove all its product types
      setSelectedSensors(selectedSensors.filter((id) => id !== sensor.id));

      setSelectedProductTypes(
        selectedProductTypes.filter((pt) => !productTypes.includes(pt))
      );
    } else {
      // Select sensor + select ALL its product types
      setSelectedSensors([...selectedSensors, sensor.id]);

      setSelectedProductTypes([
        ...new Set([...selectedProductTypes, ...productTypes]),
      ]);
    }
  };

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
      <button
        onClick={() => setTab(open ? "none" : "products")}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold shadow-sm transition-all duration-200 ${open
            ? "border-primary bg-primary text-white"
            : "border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white"
          }`}
      >
        <FiPackage size={13} className="stroke-[2.5]" />
        <span>Products</span>
        <FiChevronDown
          size={11}
          className={`stroke-[2.5] transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="ps-panel absolute top-[calc(100%+8px)] right-0 w-[600px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 z-[9999]">
          {/* Header gradient banner */}
          <div className="bg-primary px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <FaSatellite size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">
                    Satellite Products
                  </h3>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Configure providers, sensors &amp; types
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTab("none")}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors text-sm leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* ── Provider tabs ── */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Provider
              </p>
              {isLoading && providers.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                  <FiLoader size={12} className="animate-spin" />
                  Loading providers…
                </div>
              ) : fetchError ? (
                <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <span className="text-xs text-red-600">
                    Failed to load providers.
                  </span>
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
                    const isActive = selectedProvider === p.name;
                    const m = providerMeta(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedProvider(p.name)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-semibold transition-all duration-200 ${isActive
                            ? `bg-gradient-to-r ${m.color} text-white shadow-md`
                            : "text-slate-500 hover:text-slate-800 hover:bg-white"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/70" : m.dot
                            }`}
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
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sensors
                  {currentProviderObj && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {selectedSensors.length}/{currentProviderObj.sensors.length}
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAllDropdowns}
                    className="text-[11px] font-medium text-slate-500 hover:text-primary transition-colors"
                  >
                    {allDropdownsOpen ? "Close All" : "Open All"}
                  </button>

                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-primary transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={allSensorsSelected}
                      onChange={toggleAllSensors}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-primary cursor-pointer"
                    />
                    Select All
                  </label>
                </div>
              </div>

              {isLoading && !currentProviderObj ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg bg-slate-200/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : currentProviderObj?.sensors?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {currentProviderObj.sensors.map((sensor) => {
                    const checked = selectedSensors.includes(sensor.id);
                    const isOpen = openSensors.includes(sensor.id);
                    return (
                      <div
                        key={sensor.id}
                        className="rounded-lg text-primary transition-all duration-150"
                      >
                        {/* Sensor header */}
                        <div className="flex items-start gap-2.5 p-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleSensorToggle(sensor)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-primary cursor-pointer"
                          />

                          <button
                            type="button"
                            onClick={() => toggleDropdown(sensor.id)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                          >
                            <div className="min-w-0">
                              <p
                                className={`truncate text-[11px] font-semibold leading-tight ${checked ? "text-primary" : "text-slate-700"
                                  }`}
                              >
                                {sensor.name}
                              </p>

                              <p className="mt-0.5 text-[9px] font-mono font-medium text-slate-400">
                                {sensor.id}
                              </p>
                            </div>

                            {!!sensor.productTypes?.length && (
                              <FiChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
                                  }`}
                              />
                            )}
                          </button>
                        </div>

                        {/* Product type dropdown */}
                        {isOpen && !!sensor.productTypes?.length && (
                          <div className="border-t border-slate-200 bg-white px-2.5 py-2">
                            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                              Product Type
                            </p>

                            <div className="space-y-1">
                              {sensor.productTypes.map((productType) => {
                                const productChecked =
                                  selectedProductTypes.includes(productType);

                                return (
                                  <label
                                    key={productType}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={productChecked}
                                      onChange={() =>
                                        handleProductTypeToggle(
                                          sensor,
                                          productType
                                        )
                                      }
                                      className="h-3 w-3 rounded border-slate-300 accent-primary cursor-pointer"
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
        </div>
      )}
    </>
  );
};

export default ProductSwitcher;