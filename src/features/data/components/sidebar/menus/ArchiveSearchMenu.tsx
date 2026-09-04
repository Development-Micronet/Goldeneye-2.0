import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Crosshair, Loader2, Pin, Plus, ShoppingCart, Upload } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "react-toastify";

import { useAuthStore } from "../../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";
import { useIsCartHidden } from "../../../../../utils/cartPermissions";
import { useParameter } from "../../../hooks/useParameter";
import { useProductStore } from "../../../hooks/useproductStore";
import type { ProductResponse } from "../Models/product.types";
import {
  type ProductSearchPayload,
  type SatelliteProvider,
  searchProducts,
} from "../api/product.service";
import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import {
  type SelectedArchiveProduct,
  useArchiveProductStore,
} from "../store/useArchiveProductStore";
import { useMapStore } from "../../../store/useMapStore";
import { usePinnedProductStore } from "../../../hooks/usePinnedProductStore";
import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../../../store/useLayersStore";
import {
  exportCSV,
  exportHTML,
  exportKML,
  exportKMZ,
  exportShape,
} from "../../../../../utils/Exportfunction";
import Spinners from "../assets/Archive-search/Spinner.gif";
import { ArchiveProductCard, VisibilityIcon } from "../component/ArchiveProductCard";
import { ArchiveOrderForm } from "../component/Archiveorderform";

type SortOption =
  | "date"
  | "cloud_cover"
  | "incident_angle"
  | "+date"
  | "+cloud_cover"
  | "+incident_angle"
  | "-date"
  | "-cloud_cover"
  | "-incident_angle";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "-date", label: "Default (Date & Cloud)" },
  { value: "date", label: "Date (Ascending)" },
  { value: "+date", label: "Date (Descending)" },
  { value: "-cloud_cover", label: "Cloud Cover (Ascending)" },
  { value: "+cloud_cover", label: "Cloud Cover (Descending)" },
  { value: "-incident_angle", label: "Incidence Angle (Ascending)" },
  { value: "+incident_angle", label: "Incidence Angle (Descending)" },
];

const PAGE_SIZE = 50;

const EXPORTS = ["HTML", "CSV", "KML", "KMZ", "Shape"] as const;

/** First value that is actually present, so a missing field falls through. */
const first = <T,>(...values: Array<T | undefined | null>): T | undefined =>
  values.find((value) => value !== undefined && value !== null && (value as unknown) !== "");

const AIRBUS_NAMES: Record<string, string> = {
  PNEO: "Pléiades Neo",
  PLEIADES: "Pléiades",
  SPOT: "SPOT",
  PHR: "Pléiades",
  ELEVATION: "Elevation",
  DMC: "DMC",
};

const PLANET_NAMES: Record<string, string> = {
  PSScene: "PlanetScope",
  PSOrthoTile: "PlanetScope",
  SkySatCollect: "SkySat",
  SkySatScene: "SkySat",
  REOrthoTile: "RapidEye",
};

const nameFor = (provider: string, raw: Record<string, any>) => {
  if (provider === "sentinel") {
    // STAC gives "sentinel-2a" on platform, "sentinel-2" on constellation.
    const platform = first<string>(raw.platform, raw["eo:platform"], raw.constellation);
    if (!platform) return "Sentinel";

    return platform
      .split("-")
      .map((part) => (part.length > 1 ? part[0].toUpperCase() + part.slice(1) : part.toUpperCase()))
      .join("-");
  }

  if (provider === "planet") {
    const itemType = first<string>(raw.item_type, raw.itemType);
    return (itemType && PLANET_NAMES[itemType]) ?? itemType ?? "Planet";
  }

  const constellation = raw.constellation as string | undefined;
  return AIRBUS_NAMES[constellation ?? ""] ?? constellation ?? "Satellite";
};

/**
 * Each provider names the same reading differently, so the card gets one shape
 * regardless of which API answered.
 */
const toArchiveProduct = (item: any, provider: string): SelectedArchiveProduct => {

  // console.log("item", item)
  const properties = item.properties ?? {};
  const raw: Record<string, any> = properties.raw ?? {};

  const base = {
    id: item.id,
    imageUrl: properties.image_url,
    wmts_url: properties.wmts_url,
    wms_url: properties.wms_url,
    coordinates: item.geometry?.coordinates,
    geometry: item.geometry,
    date: properties.date,
    sensor: properties.sensor,
    raw,
  };

  if (provider === "sentinel") {
    return {
      ...base,
      name: nameFor(provider, raw),
      acquisitionDate: first(raw.datetime, raw.acquisitionDate, properties.date),
      // Sentinel-2 is 10m; the STAC item carries it as gsd when present.
      resolution: first(raw.gsd, raw.resolution, 10),
      cloud_cover: first(properties.cloud_cover, raw["eo:cloud_cover"], raw.cloudCover),
      incidenceAngle: first(
        properties.incidence_angle,
        raw["view:incidence_angle"],
        raw["view:off_nadir"]
      ),
    } as SelectedArchiveProduct;
  }

  if (provider === "planet") {
    return {
      ...base,
      name: nameFor(provider, raw),
      acquisitionDate: first(raw.acquired, raw.datetime, properties.date),
      resolution: first(raw.gsd, raw.pixel_resolution, raw.resolution),
      cloud_cover: first(properties.cloud_cover, raw.cloud_cover, raw.cloud_percent),
      incidenceAngle: first(properties.incidence_angle, raw.view_angle, raw.satellite_azimuth),
    } as SelectedArchiveProduct;
  }

  // Airbus
  return {
    ...base,
    name: nameFor(provider, raw),
    acquisitionDate: first(raw.acquisitionDate, properties.date),
    resolution: first(raw.resolution, raw.gsd),
    cloud_cover: first(properties.cloud_cover, raw.cloudCover),
    incidenceAngle: first(properties.incidence_angle, raw.incidenceAngle),
  } as SelectedArchiveProduct;
};

export const ArchiveSearchMenu: React.FC = () => {
  const { pinnedProducts, clearPinnedProducts, selectAllPinned } = usePinnedProductStore();
  const { cloudcover, dateMode, startDate, endDate, incidentAngle } = useParameter();
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const queryClient = useQueryClient();
  const layers = useLayersStore((state) => state.layers);
  const { setFlyToProduct } = useMapStore();
  const { providers, selectedProvider, selectedSensors, selectedProductTypes } = useProductStore();
  const { accessToken } = useAuthStore();

  const provider = selectedProvider as SatelliteProvider;
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const isAirbus = selectedProvider === "airbus";

  const [currentpage, setcurrentpage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("+date");
  const [open, setOpen] = useState(false);

  // The product whose order criteria are open. Set by the card's cart button.
  const [orderProduct, setOrderProduct] = useState<SelectedArchiveProduct | null>(null);
  const isCartHidden = useIsCartHidden();

  const {
    selectedProducts,
    toggleProduct,
    selectAllProducts,
    clearProducts,
    isSelected,
    toggleVisibility,
    showSelectedProducts,
    hideAllProducts,
    isVisible,
    loadingProductIds,
  } = useArchiveProductStore();

  const normalizeProductType = (productType: string): string => {
    if (!productType) return "";

    const value = productType.toLowerCase().replace(/\s+/g, " ").trim();

    // Most specific first
    if (value.includes("quality layers + ortho")) return "quality layers + ortho";
    if (value.includes("quality layers")) return "quality layers";
    if (value.includes("tristereo")) return "tristereo";
    if (value.includes("stereo")) return "stereo";
    if (value.includes("mono")) return "mono";
    if (value.includes("dsm")) return "dsm";
    if (value.includes("dem")) return "dem";

    // 32m, 22m, 1.5m etc.
    const resolutionMatch = value.match(/(?:^|[-_\s])(\d+(?:\.\d+)?)\s*-?\s*m(?![a-z])/);
    if (resolutionMatch) return `${resolutionMatch[1]}m`;

    return "";
  };

  const productType = useMemo(
    () => [...new Set(selectedProductTypes.map(normalizeProductType).filter(Boolean))].join(","),
    [selectedProductTypes]
  );

  const sensors = useMemo(() => {
    const currentProviderObj = providers.find((p) => p.name === selectedProvider);
    if (!currentProviderObj) return selectedSensors;
    const providerSensorIds = currentProviderObj.sensors.map((s) => s.id);
    return selectedSensors.filter((id) => providerSensorIds.includes(id));
  }, [providers, selectedProvider, selectedSensors]);

  const aoi = useMemo(() => {
    const layer = layers.find((l) => l.id === selectedAOIId);
    const geom = layer?.geojson.geometry ?? null;
    if (!geom) return null;

    // Normalize to Polygon — turf.buffer can occasionally return MultiPolygon
    if (geom.type === "Polygon") {
      return geom as { type: "Polygon"; coordinates: number[][][] };
    }
    if (geom.type === "MultiPolygon" && geom.coordinates?.length > 0) {
      return {
        type: "Polygon" as const,
        coordinates: geom.coordinates[0] as number[][][],
      };
    }
    return null;
  }, [layers, selectedAOIId]);

  const aoiLabel = useMemo(
    () => layers.find((l) => l.id === selectedAOIId)?.label ?? "Area of interest",
    [layers, selectedAOIId]
  );

  const aoiKey = useMemo(() => JSON.stringify(aoi), [aoi]);

  const cloudCoverRange = useMemo(
    () => (Array.isArray(cloudcover) ? cloudcover : JSON.parse(cloudcover || "[0,100]")),
    [cloudcover]
  );

  const incidenceAngleRange = useMemo(
    () => (Array.isArray(incidentAngle) ? incidentAngle : JSON.parse(incidentAngle || "[0,60]")),
    [incidentAngle]
  );

  const { effectiveStartDate, effectiveEndDate } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    if (dateMode === "after" && startDate) {
      return {
        effectiveStartDate: startDate,
        effectiveEndDate: todayStr > startDate ? todayStr : "2099-12-31",
      };
    }
    if (dateMode === "before" && (startDate || endDate)) {
      return {
        effectiveStartDate: "1970-01-01",
        effectiveEndDate: endDate || startDate,
      };
    }
    if (dateMode === "between") {
      return {
        effectiveStartDate: startDate || undefined,
        effectiveEndDate: endDate || undefined,
      };
    }
    return {
      effectiveStartDate: startDate || undefined,
      effectiveEndDate: endDate || undefined,
    };
  }, [dateMode, startDate, endDate]);

  const [products, setproducts] = useState<ProductResponse | null>(null);

  const searchKey = useMemo(
    () =>
      JSON.stringify({
        provider,
        dateMode,
        effectiveStartDate,
        effectiveEndDate,
        cloudCoverRange,
        incidenceAngleRange,
        sensors,
        aoiKey,
        sortBy,
        ...(isAirbus && { productType }),
      }),
    [
      provider,
      dateMode,
      effectiveStartDate,
      effectiveEndDate,
      cloudCoverRange,
      incidenceAngleRange,
      sensors,
      aoiKey,
      sortBy,
      isAirbus,
      productType,
    ]
  );

  const { isLoading, isError, isPending, refetch } = useQuery({
    queryKey: ["archive-products", searchKey, currentpage],

    queryFn: async () => {
      const payload: ProductSearchPayload = {
        provider,
        ...(effectiveStartDate ? { start_date: effectiveStartDate } : {}),
        ...(effectiveEndDate ? { end_date: effectiveEndDate } : {}),
        cloud_cover: cloudCoverRange,
        incidence_angle: incidenceAngleRange,
        sortBy,
        intersects: aoi!,
        sensors,
        start_page: currentpage,
        items_per_page: PAGE_SIZE,
        limit: PAGE_SIZE,
        ...(provider === "airbus" && {
          productType:
            productType ||
            "mono,stereo,tristereo,32m,22m,dsm,quality layers,quality layers + ortho",
        }),
      };

      const response = await searchProducts(payload);
      const decrypted = (await decryptAESGCM(response.data, token)) as ProductResponse;

      setproducts((prev) =>
        currentpage === 1
          ? decrypted
          : {
            ...decrypted,
            features: [...(prev?.features ?? []), ...decrypted.features],
          }
      );

      return decrypted;
    },

    enabled: Boolean(aoi) && Boolean(token),
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    setcurrentpage(1);
  }, [searchKey]);

  const mappedProducts: SelectedArchiveProduct[] =
    products?.features.map((item) => toArchiveProduct(item, provider)) ?? [];

  const allSelected =
    mappedProducts.length > 0 && mappedProducts.every((product) => isSelected(product.id));

  const allSelectedVisible =
    selectedProducts.length > 0 && selectedProducts.every((product) => isVisible(product.id));

  const handleSelectAll = () => {
    if (allSelected) clearProducts();
    else selectAllProducts(mappedProducts);
  };

  const requireSelection = () => {
    if (selectedProducts.length) return true;
    toast.info("Please select products first");
    return false;
  };

  const handleExport = async (format: (typeof EXPORTS)[number]) => {
    if (!selectedProducts.length) {
      toast.error("Please select at least one product to export.");
      return;
    }

    const items = selectedProducts;
    const base = `${aoiLabel} - Archive`;

    try {
      if (format === "HTML") await exportHTML({ items, filename: `${base}.html` });
      if (format === "CSV") await exportCSV({ items, filename: `${base}.csv` });
      if (format === "KML")
        await exportKML({
          format: "kml",
          items,
          aoi: aoi!,
          filename: `${base}.kml`,
          lang: "en",
          extraInfos: { exportedBy: "Archive System", provider: "Airbus" },
        });
      if (format === "KMZ")
        await exportKMZ({
          format: "kmz",
          items,
          aoi: aoi!,
          filename: `${base}.kmz`,
          lang: "en",
          extraInfos: { exportedBy: "Archive System", provider: "Airbus" },
        });
      if (format === "Shape") await exportShape({ items, aoi: aoi!, filename: `${base}.zip` });

      setOpen(false);
    } catch {
      toast.error(`Failed to export ${format}.`);
    }
  };

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["archive-products"] });
      setproducts(null);
      setcurrentpage(1);
      clearProducts();
      clearPinnedProducts();
    };
  }, [queryClient, searchKey]);

  if (!aoi) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <p className="text-primary mb-5 max-w-65 text-sm font-semibold">
          Please Create or Select AOI Before Searching.
        </p>

        <button className="bg-primary/10 hover:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-lg border">
          <AoiDrawIcon />
        </button>
      </div>
    );
  }

  // The cart button swaps the list for the order criteria form.
  if (orderProduct) {
    return (
      <ArchiveOrderForm
        product={orderProduct}
        aoi={aoi}
        aoiLabel={aoiLabel}
        onClose={() => setOrderProduct(null)}
      />
    );
  }

  const toolbarButton = "rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-primary";
  const loadedCount = mappedProducts.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Results count, sort and export */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-sm font-semibold text-gray-900">
          {products?.pagination.total_count ?? 0} results
        </span>

        <div className="flex items-center gap-1.5">
          <label htmlFor="sort" className="text-xs text-gray-600">
            Sort By:
          </label>
          <div className="relative">
            <select
              id="sort"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortOption);
                setcurrentpage(1);
              }}
              className="text-primary focus:border-primary cursor-pointer appearance-none rounded border border-transparent bg-transparent py-0.5 pr-5 pl-1 text-xs outline-none hover:border-gray-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="text-primary pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2"
            />
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content="Export"
            className={toolbarButton}
          >
            <Upload size={16} />
          </button>

          {open && (
            <div className="absolute top-full right-0 z-50 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {EXPORTS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(format)}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export {format}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-y border-gray-200 px-3 py-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            aria-label={allSelected ? "Deselect all" : "Select all"}
            className="accent-primary h-3.5 w-3.5 cursor-pointer"
          />
          {selectedProducts.length > 0 && (
            <span className="text-primary text-xs">({selectedProducts.length} Selected)</span>
          )}
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => requireSelection() && setFlyToProduct(selectedProducts[0])}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content="Zoom to target"
            className={toolbarButton}
          >
            <Crosshair size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (pinnedProducts.length) {
                clearPinnedProducts();
                toast.success("All pinned products removed");
              } else {
                selectAllPinned(mappedProducts);
                toast.success(`${mappedProducts.length} products pinned`);
              }
            }}
            data-tooltip-id="archive-tooltip"
            data-tooltip-content={pinnedProducts.length ? "Clear all pins" : "Select"}
            className={`${toolbarButton} ${pinnedProducts.length ? "text-primary" : ""}`}
          >
            <Pin size={16} />
          </button>

          {(() => {
            const isAnySelectedLoading = selectedProducts.some((p) => loadingProductIds.includes(p.id));
            return (
              <button
                type="button"
                onClick={() => {
                  if (!requireSelection()) return;
                  if (isAnySelectedLoading) return;

                  if (allSelectedVisible) {
                    hideAllProducts();
                    toast.success("All selected products hidden from map");
                  } else {
                    showSelectedProducts();
                    toast.success(`${selectedProducts.length} products displayed on map`);
                  }
                }}
                disabled={isAnySelectedLoading}
                data-tooltip-id="archive-tooltip"
                data-tooltip-content={
                  isAnySelectedLoading
                    ? "Loading..."
                    : allSelectedVisible
                    ? "Hide from map"
                    : "Visibility"
                }
                className={`${toolbarButton} ${allSelectedVisible ? "text-primary" : ""} ${
                  isAnySelectedLoading ? "cursor-wait opacity-80" : ""
                }`}
              >
                {isAnySelectedLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <VisibilityIcon dimmed={!allSelectedVisible} />
                )}
              </button>
            );
          })()}

          {!isCartHidden && (
            <button
              type="button"
              onClick={() => requireSelection() && setOrderProduct(selectedProducts[0])}
              data-tooltip-id="archive-tooltip"
              data-tooltip-content="Add to cart"
              className={toolbarButton}
            >
              <ShoppingCart size={16} />
            </button>
          )}

          {/* Loaded range, with a button to pull the next page */}
          <div className="ml-1 flex items-center gap-1 rounded-full border border-gray-200 py-0.5 pr-0.5 pl-2.5">
            <span className="text-xs text-gray-700">1–{loadedCount}</span>
            <button
              type="button"
              onClick={() => setcurrentpage((page) => page + 1)}
              disabled={isPending || loadedCount >= (products?.pagination.total_count ?? 0)}
              data-tooltip-id="archive-tooltip"
              data-tooltip-content="Load more"
              className="bg-primary hover:bg-primary/90 flex h-6 w-6 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isError && (
          <div className="m-3 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </span>
              <div>
                <p className="text-sm font-semibold">Unable to load products</p>
                <p className="text-xs text-red-600">Something went wrong. Please try again.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => refetch?.()}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {mappedProducts.map((product) => (
          <ArchiveProductCard
            key={product.id}
            product={product}
            checked={isSelected(product.id)}
            isVisible={isVisible(product.id)}
            onToggleSelect={toggleProduct}
            onToggleVisibility={toggleVisibility}
            onFlyToProduct={setFlyToProduct}
            onOrder={setOrderProduct}
          />
        ))}

        {/* First page fills the panel; later pages append below the list. */}
        {isLoading && !mappedProducts.length && (
          <div className="flex h-full items-center justify-center">
            <img src={Spinners} alt="Loading" className="h-24 w-24" />
          </div>
        )}

        {isPending && mappedProducts.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
            <img src={Spinners} alt="" className="h-5 w-5" />
            Loading more...
          </div>
        )}
      </div>

      <Tooltip
        id="archive-tooltip"
        place="top"
        className="z-50 !rounded !bg-gray-900 !px-2 !py-1 !text-xs !text-white !opacity-100"
      />
    </div>
  );
};