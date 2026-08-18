import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Square,
  Trash2,
  Upload,
  CheckSquare,
  PinOff,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";
import { useQueryClient } from "@tanstack/react-query";
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
import { toast } from "react-toastify";
import { ArchiveProductCard } from "../component/ArchiveProductCard";
import { useMapStore } from "../../../store/useMapStore";
import { usePinnedProductStore } from "../../../hooks/usePinnedProductStore";
import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../../../store/useLayersStore";
import { ArchiveProductCardSkeleton } from "../component/ArchiveProductCardSkeleton";
import { ChevronRight, Loader2 } from "lucide-react";
import {
  exportCSV,
  exportHTML,
  exportKML,
  exportKMZ,
  exportShape,
} from "../../../../../utils/Exportfunction";
import { logger } from "../../../../../utils/logger";
import Spinners from "../assets/Archive-search/Spinner.gif";

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

export const ArchiveSearchMenu: React.FC = () => {
  const { pinnedProducts, clearPinnedProducts, selectAllPinned } = usePinnedProductStore();
  const { cloudcover, startDate, endDate, incidentAngle } = useParameter();
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const queryClient = useQueryClient();
  const layers = useLayersStore((state) => state.layers);
  const { setFlyToProduct } = useMapStore();
  const { selectedProvider, selectedSensors, selectedProductTypes } = useProductStore();
  const { accessToken } = useAuthStore();
  const provider = selectedProvider as SatelliteProvider;
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const isAirbus = selectedProvider === "airbus";
  const [currentpage, setcurrentpage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("-date");
  const [open, setOpen] = useState(false);
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
  } = useArchiveProductStore();

  const sortOptions = [
    {
      value: "date",
      label: "Oldest Acquisition (Default)",
    },
    {
      value: "+date",
      label: "Newest Acquisition",
    },
    {
      value: "+cloud_cover",
      label: "Highest Cloud Cover (Descending) (Default)",
    },
    {
      value: "-cloud_cover",
      label: "Lowest Cloud Cover (Ascending)",
    },
    {
      value: "+incident_angle",
      label: "Highest Incidence Angle (Default) (Descending)",
    },
    {
      value: "-incident_angle",
      label: "Lowest Incidence Angle (Ascending)",
    },
  ];
  const normalizeProductType = (productType: string): string => {
    if (!productType) return "";

    const value = productType
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    // Most specific first
    if (value.includes("quality layers + ortho")) {
      return "quality layers + ortho";
    }

    if (value.includes("quality layers")) {
      return "quality layers";
    }

    if (value.includes("tristereo")) {
      return "tristereo";
    }

    if (value.includes("stereo")) {
      return "stereo";
    }

    if (value.includes("mono")) {
      return "mono";
    }

    if (value.includes("dsm")) {
      return "dsm";
    }

    if (value.includes("dem")) {
      return "dem";
    }

    // 32m, 22m, 1.5m etc.
    const resolutionMatch = value.match(
      /(?:^|[-_\s])(\d+(?:\.\d+)?)\s*-?\s*m(?![a-z])/
    );

    if (resolutionMatch) {
      return `${resolutionMatch[1]}m`;
    }

    return "";
  };

  const productType = useMemo(() => {
    return [
      ...new Set(
        selectedProductTypes
          .map(normalizeProductType)
          .filter(Boolean)
      ),
    ].join(",");
  }, [selectedProductTypes]);
  const sensors = selectedSensors;

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

  const aoiKey = useMemo(() => JSON.stringify(aoi), [aoi]);

  const allSelectedVisible =
    selectedProducts.length > 0 && selectedProducts.every((product) => isVisible(product.id));

  const cloudCoverRange = useMemo(() => {
    return Array.isArray(cloudcover) ? cloudcover : JSON.parse(cloudcover || "[0,100]");
  }, [cloudcover]);

  const incidenceAngleRange = useMemo(() => {
    return Array.isArray(incidentAngle) ? incidentAngle : JSON.parse(incidentAngle || "[0,60]");
  }, [incidentAngle]);

  const [products, setproducts] = useState<ProductResponse | null>(null);

  const searchKey = useMemo(
    () =>
      JSON.stringify({
        provider,
        startDate,
        endDate,
        cloudCoverRange,
        incidenceAngleRange,
        sensors,
        aoiKey,
        sortBy,
        ...(isAirbus && { productType }),
      }),
    [
      provider,
      startDate,
      endDate,
      cloudCoverRange,
      incidenceAngleRange,
      sensors,
      aoiKey,
      sortBy,
      isAirbus,
      productType,
    ],
  );


  const { isLoading, isError, isPending, refetch } = useQuery({
    queryKey: ["archive-products", searchKey, currentpage],

    queryFn: async () => {
      const payload: ProductSearchPayload = {
        provider,
        start_date: startDate,
        end_date: endDate,
        cloud_cover: cloudCoverRange,
        incidence_angle: incidenceAngleRange,
        sortBy,
        intersects: aoi!,
        sensors,
        start_page: currentpage,
        items_per_page: 100,
        limit: 100,
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
          },
      );

      return decrypted;
    },

    enabled: Boolean(aoi) && Boolean(token),
    staleTime: 0,
    refetchOnMount: true,
  });
  const getSatelliteName = (constellation?: string) => {
    const satellites: Record<string, string> = {
      PNEO: "Pléiades Neo",
      PLEIADES: "Pléiades",
      SPOT: "SPOT",
      PHR: "Pléiades",
      ELEVATION: "Elevation",
      DMC: "DMC",
    };

    return satellites[constellation ?? ""] || constellation || "Satellite";
  };

  const mappedProducts: SelectedArchiveProduct[] =
    products?.features.map((item) => ({
      id: item.id,

      name: getSatelliteName(item.properties.raw.constellation),

      imageUrl: item.properties.image_url,

      coordinates: item.geometry.coordinates,

      geometry: item.geometry,

      date: item.properties.date,

      acquisitionDate: item.properties.raw.acquisitionDate,

      sensor: item.properties.sensor,

      resolution: item.properties.raw.resolution,

      cloud_cover: item.properties.cloud_cover,

      incidenceAngle: item.properties.incidence_angle,

      raw: item.properties.raw,
    })) ?? [];


  const handleSelectAll = () => {
    const allSelected =
      mappedProducts.length > 0 && mappedProducts.every((product) => isSelected(product.id));
    if (allSelected) {
      clearProducts();
    } else {
      selectAllProducts(mappedProducts);
    }
  };

  const incrementPage = () => {
    setcurrentpage((currentpage) => currentpage + 1);
  };

  useEffect(() => {
    return () => {
      queryClient.removeQueries({
        queryKey: ["archive-products"],
      });

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

  return (
    <div className="relative h-full">
      <div className="flex h-full flex-col bg-gray-50">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          {/* Left */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {products?.pagination.total_count ?? 0} Results
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Archive Products</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Sort
            </span>

            <div className="relative inline-block">
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setcurrentpage(1);
                }}
                className="focus:border-primary focus:ring-primary/20 h-8 w-44 appearance-none rounded-md border border-gray-300 bg-white pr-8 pl-3 text-sm text-gray-700 shadow-sm transition outline-none hover:border-gray-400 focus:ring-2"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <svg
                className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Clear Selected Products"
              onClick={clearProducts}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>

            <div className="relative">
              <button
                type="button"
                title="Export Products"
                onClick={() => setOpen((prev) => !prev)}
                className="hover:border-primary/20 hover:bg-primary/5 hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition"
              >
                <Upload size={16} />
              </button>

              {open && (
                <div className="absolute top-full right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={async () => {
                      if (!selectedProducts.length) {
                        toast.error("Please select at least one product to export.");
                        return;
                      }

                      try {
                        await exportHTML({
                          items: selectedProducts,
                          filename: "Pleiades_Report.html",
                        });

                        setOpen(false);
                      } catch (error) {
                        logger.error(error);
                        toast.error("Failed to export HTML.");
                      }
                    }}
                  >
                    Export HTML
                  </button>

                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={async () => {
                      if (!selectedProducts.length) {
                        toast.error("Please select at least one product to export.");
                        return;
                      }

                      try {
                        await exportCSV({
                          items: selectedProducts,
                          filename: "Pleiades_Report.csv",
                        });

                        setOpen(false);
                      } catch (error) {
                        logger.error(error);
                        toast.error("Failed to export HTML.");
                      }
                    }}
                  >
                    Export CSV
                  </button>

                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={async () => {
                      try {
                        if (!selectedProducts.length) {
                          toast.error("Please select at least one product to export.");
                          return;
                        }
                        await exportKML({
                          format: "kml",
                          items: selectedProducts,
                          aoi: aoi,
                          filename: "Rectangle 1 - Pleiades 50cm.kml",
                          lang: "en",
                          extraInfos: {
                            exportedBy: "Archive System",
                            provider: "Airbus",
                          },
                        });

                        setOpen(false);
                      } catch (error) {
                        logger.error("KML Export Error:", error);

                        toast.error("Failed to export KML.");
                      }
                    }}
                  >
                    Export KML
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={async () => {
                      if (!selectedProducts.length) {
                        toast.error("Please select at least one product to export.");
                        return;
                      }

                      try {
                        await exportKMZ({
                          format: "kmz",
                          items: selectedProducts,
                          aoi: aoi,
                          filename: "Rectangle 1 - Pleiades 50cm.kmz",
                          lang: "en",
                          extraInfos: {
                            exportedBy: "Archive System",
                            provider: "Airbus",
                          },
                        });

                        setOpen(false);
                      } catch (error) {
                        logger.error("KMZ Export Error:", error);

                        toast.error("Failed to export KMZ.");
                      }
                    }}
                  >
                    Export KMZ
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={async () => {
                      if (!selectedProducts.length) {
                        toast.error("Please select at least one product to export.");
                        return;
                      }

                      await exportShape({
                        items: selectedProducts,
                        aoi: aoi,
                        filename: "Rectangle 1 - Pleiades 50cm (1).zip",
                      });

                      setOpen(false);
                    }}
                  >
                    Export Shape
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center gap-1">
            {/* Pin All / Clear All Pins */}
            <button
              type="button"
              onClick={() => {
                if (pinnedProducts.length > 0) {
                  clearPinnedProducts();
                  toast.success("All pinned products removed");
                } else {
                  selectAllPinned(mappedProducts);
                  toast.success(`${mappedProducts.length} products pinned`);
                }
              }}
              title={pinnedProducts.length > 0 ? "Clear All Pins" : "Select All Pins"}
              className="rounded-md p-2 transition hover:bg-gray-100"
            >
              {pinnedProducts.length > 0 ? (
                <PinOff size={17} className="text-primary" />
              ) : (
                <ListChecks size={17} className="text-gray-600" />
              )}
            </button>
            {/* Select / Deselect All */}
            <button
              type="button"
              onClick={handleSelectAll}
              title={
                mappedProducts.length > 0 &&
                  mappedProducts.every((product) => isSelected(product.id))
                  ? "Deselect All"
                  : "Select All"
              }
              className="rounded-md p-2 transition hover:bg-gray-100"
            >
              {mappedProducts.length > 0 &&
                mappedProducts.every((product) => isSelected(product.id)) ? (
                <CheckSquare size={17} className="text-primary" />
              ) : (
                <Square size={17} className="text-gray-600" />
              )}
            </button>

            {/* Show / Hide All Selected on Map */}
            <button
              type="button"
              onClick={() => {
                if (selectedProducts.length === 0) {
                  toast.info("Please select products first");
                  return;
                }
                if (allSelectedVisible) {
                  hideAllProducts();
                  toast.success("All selected products hidden from map");
                } else {
                  showSelectedProducts();
                  toast.success(`${selectedProducts.length} products displayed on map`);
                }
              }}
              title={
                selectedProducts.length > 0 && allSelectedVisible
                  ? "Hide All From Map"
                  : "Show All On Map"
              }
              className="rounded-md p-2 transition hover:bg-gray-100"
            >
              {selectedProducts.length > 0 && allSelectedVisible ? (
                <Eye size={17} className="text-primary" />
              ) : (
                <Eye size={17} className="text-gray-600" />
              )}
            </button>

            {/* fetch more products */}
            <button
              type="button"
              onClick={incrementPage}
              disabled={isPending}
              className="border-border text-primary hover:bg-primary flex h-9 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-medium transition-all duration-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span>1–{products?.features.length ?? 0}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isError && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>

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
          <div className="space-y-2">
            {mappedProducts.map((product) => (
              <ArchiveProductCard
                key={product.id}
                product={product}
                checked={isSelected(product.id)}
                isVisible={isVisible(product.id)}
                onToggleSelect={toggleProduct}
                onToggleVisibility={toggleVisibility}
                onFlyToProduct={setFlyToProduct}
              />
            ))}
          </div>
          {isLoading && (
            <div className="w-[32rem]">
              {" "}
              <div className="flex flex-col items-center justify-start h-[calc(100vh-173px)] py-4">
                <div>
                  <img
                    src={Spinners}
                    alt="Loading..."
                    className="w-30 h-30 mt-[16rem]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   useInfiniteQuery,
//   keepPreviousData,
// } from "@tanstack/react-query";
// import {
//   Eye,
//   Square,
//   Trash2,
//   Upload,
//   CheckSquare,
//   PinOff,
//   ListChecks,
//   AlertCircle,
// } from "lucide-react";
// import { useAuthStore } from "../../../../../store/useAuthStore";
// import { decryptAESGCM } from "../../../../../utils/dataDecrypt";
// import { useParameter } from "../../../hooks/useParameter";
// import { useProductStore } from "../../../hooks/useproductStore";
// import type { ProductResponse } from "../Models/product.types";
// import {
//   type ProductSearchPayload,
//   type SatelliteProvider,
//   searchProducts,
// } from "../api/product.service";
// import { AoiDrawIcon } from "../icons/AoiDrawIcon";
// import {
//   type SelectedArchiveProduct,
//   useArchiveProductStore,
// } from "../store/useArchiveProductStore";
// import { toast } from "react-toastify";
// import { ArchiveProductCard } from "../component/ArchiveProductCard";
// import { useMapStore } from "../../../store/useMapStore";
// import { usePinnedProductStore } from "../../../hooks/usePinnedProductStore";
// import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
// import { useLayersStore } from "../../../../../store/useLayersStore";
// import { ArchiveProductCardSkeleton } from "../component/ArchiveProductCardSkeleton";
// import { ChevronRight, Loader2 } from "lucide-react";
// import {
//   exportCSV,
//   exportHTML,
//   exportKML,
//   exportKMZ,
//   exportShape,
// } from "../../../../../utils/Exportfunction";
// import { logger } from "../../../../../utils/logger";

// /** Quiet period before search parameter changes are committed to the query key. */
// const SEARCH_DEBOUNCE_MS = 500;

// const ITEMS_PER_PAGE = 100;

// const DEFAULT_AIRBUS_PRODUCT_TYPES =
//   "mono,stereo,tristereo,32m,22m,dsm,quality layers,quality layers + ortho";

// type SortOption =
//   | "date"
//   | "cloud_cover"
//   | "incident_angle"
//   | "+date"
//   | "+cloud_cover"
//   | "+incident_angle"
//   | "-date"
//   | "-cloud_cover"
//   | "-incident_angle";

// type AoiPolygon = { type: "Polygon"; coordinates: number[][][] };

// /** Everything that defines a search. Nothing else may live in here. */
// type SearchParams = {
//   provider: SatelliteProvider;
//   startDate: string;
//   endDate: string;
//   cloudCoverRange: number[];
//   incidenceAngleRange: number[];
//   sensors: string[];
//   aoi: AoiPolygon | null;
//   sortBy: SortOption;
//   productType?: string;
// };

// export const ArchiveSearchMenu: React.FC = () => {
//   const { pinnedProducts, clearPinnedProducts, selectAllPinned } =
//     usePinnedProductStore();
//   const { cloudcover, startDate, endDate, incidentAngle } = useParameter();
//   const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
//   const layers = useLayersStore((state) => state.layers);
//   const { setFlyToProduct } = useMapStore();
//   const { selectedProvider, selectedSensors, selectedProductTypes } =
//     useProductStore();
//   const { accessToken } = useAuthStore();

//   const provider = selectedProvider as SatelliteProvider;
//   const token = accessToken?.replace("Bearer ", "").trim() || "";
//   const isAirbus = selectedProvider === "airbus";

//   const [sortBy, setSortBy] = useState<SortOption>("-date");
//   const [open, setOpen] = useState(false);

//   const {
//     selectedProducts,
//     toggleProduct,
//     selectAllProducts,
//     clearProducts,
//     isSelected,
//     toggleVisibility,
//     showSelectedProducts,
//     hideAllProducts,
//     isVisible,
//   } = useArchiveProductStore();

//   const sortOptions = [
//     { value: "date", label: "Oldest Acquisition (Default)" },
//     { value: "+date", label: "Newest Acquisition" },
//     { value: "+cloud_cover", label: "Highest Cloud Cover (Descending) (Default)" },
//     { value: "-cloud_cover", label: "Lowest Cloud Cover (Ascending)" },
//     {
//       value: "+incident_angle",
//       label: "Highest Incidence Angle (Default) (Descending)",
//     },
//     { value: "-incident_angle", label: "Lowest Incidence Angle (Ascending)" },
//   ];

//   const normalizeProductType = (productType: string): string => {
//     if (!productType) return "";

//     const value = productType.toLowerCase().replace(/\s+/g, " ").trim();

//     // Most specific first
//     if (value.includes("quality layers + ortho")) return "quality layers + ortho";
//     if (value.includes("quality layers")) return "quality layers";
//     if (value.includes("tristereo")) return "tristereo";
//     if (value.includes("stereo")) return "stereo";
//     if (value.includes("mono")) return "mono";
//     if (value.includes("dsm")) return "dsm";
//     if (value.includes("dem")) return "dem";

//     // 32m, 22m, 1.5m etc.
//     const resolutionMatch = value.match(
//       /(?:^|[-_\s])(\d+(?:\.\d+)?)\s*-?\s*m(?![a-z])/
//     );
//     if (resolutionMatch) return `${resolutionMatch[1]}m`;

//     return "";
//   };

//   const productType = useMemo(() => {
//     return [
//       ...new Set(selectedProductTypes.map(normalizeProductType).filter(Boolean)),
//     ].join(",");
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedProductTypes]);

//   const aoi = useMemo<AoiPolygon | null>(() => {
//     const layer = layers.find((l) => l.id === selectedAOIId);
//     const geom = layer?.geojson.geometry ?? null;
//     if (!geom) return null;

//     // Normalize to Polygon — turf.buffer can occasionally return MultiPolygon
//     if (geom.type === "Polygon") {
//       return geom as AoiPolygon;
//     }
//     if (geom.type === "MultiPolygon" && geom.coordinates?.length > 0) {
//       return {
//         type: "Polygon" as const,
//         coordinates: geom.coordinates[0] as number[][][],
//       };
//     }
//     return null;
//   }, [layers, selectedAOIId]);

//   const cloudCoverRange = useMemo(() => {
//     return Array.isArray(cloudcover)
//       ? cloudcover
//       : JSON.parse(cloudcover || "[0,100]");
//   }, [cloudcover]);

//   const incidenceAngleRange = useMemo(() => {
//     return Array.isArray(incidentAngle)
//       ? incidentAngle
//       : JSON.parse(incidentAngle || "[0,60]");
//   }, [incidentAngle]);

//   /* ────────────────────────────────────────────────────────────
//      1. Raw search parameters
//      Only fields that change WHAT the server returns belong here.
//      Selection, pinning, visibility, export and UI state must not.
//      ──────────────────────────────────────────────────────────── */
//   const searchParams = useMemo<SearchParams>(
//     () => ({
//       provider,
//       startDate,
//       endDate,
//       cloudCoverRange,
//       incidenceAngleRange,
//       // sorted so that reordering the same set is not a new search
//       sensors: [...selectedSensors].sort(),
//       aoi,
//       sortBy,
//       // resolved here (not in queryFn) so key and payload can never disagree
//       productType: isAirbus
//         ? productType || DEFAULT_AIRBUS_PRODUCT_TYPES
//         : undefined,
//     }),
//     [
//       provider,
//       startDate,
//       endDate,
//       cloudCoverRange,
//       incidenceAngleRange,
//       selectedSensors,
//       aoi,
//       sortBy,
//       isAirbus,
//       productType,
//     ]
//   );

//   /* Value-based signal. Stable across re-renders that recreate the
//      arrays/objects above without changing their contents. */
//   const searchKey = useMemo(() => JSON.stringify(searchParams), [searchParams]);

//   /* ────────────────────────────────────────────────────────────
//      2. Debounced copy — this is what React Query sees
//      ──────────────────────────────────────────────────────────── */
//   const paramsRef = useRef(searchParams);
//   paramsRef.current = searchParams;

//   const [debounced, setDebounced] = useState<{
//     key: string;
//     params: SearchParams;
//   }>(() => ({ key: searchKey, params: searchParams }));

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebounced((prev) =>
//         // returning prev bails out of the re-render entirely
//         prev.key === searchKey
//           ? prev
//           : { key: searchKey, params: paramsRef.current }
//       );
//     }, SEARCH_DEBOUNCE_MS);

//     return () => clearTimeout(timer);
//   }, [searchKey]);

//   /* Initial state is seeded from the first render, so the first search
//      fires immediately rather than waiting out the debounce. */

//   /* ────────────────────────────────────────────────────────────
//      3. The query. Page number is NOT part of the key, so new
//         parameters restart at page 1 with no extra state update.
//      ──────────────────────────────────────────────────────────── */
//   const {
//     data,
//     isLoading,
//     isError,
//     isFetching,
//     isFetchingNextPage,
//     hasNextPage,
//     fetchNextPage,
//     refetch,
//   } = useInfiniteQuery({
//     queryKey: ["archive-products", debounced.key],

//     queryFn: async ({ pageParam, signal }) => {
//       // Built from debounced.params — never from live state.
//       const p = debounced.params;

//       const payload: ProductSearchPayload = {
//         provider: p.provider,
//         start_date: p.startDate,
//         end_date: p.endDate,
//         cloud_cover: p.cloudCoverRange,
//         incidence_angle: p.incidenceAngleRange,
//         sortBy: p.sortBy,
//         intersects: p.aoi!,
//         sensors: p.sensors,
//         start_page: pageParam,
//         items_per_page: ITEMS_PER_PAGE,
//         limit: ITEMS_PER_PAGE,
//         ...(p.productType ? { productType: p.productType } : {}),
//       };

//       const response = await searchProducts(payload, { signal });

//       return (await decryptAESGCM(response.data, token)) as ProductResponse;
//     },

//     initialPageParam: 1,

//     getNextPageParam: (lastPage, allPages) => {
//       const loaded = allPages.reduce(
//         (count, page) => count + (page.features?.length ?? 0),
//         0
//       );
//       const total = lastPage.pagination?.total_count ?? 0;
//       return loaded < total ? allPages.length + 1 : undefined;
//     },

//     enabled: Boolean(debounced.params.aoi) && Boolean(token),

//     // Repeating a previous search inside this window is a cache hit.
//     staleTime: 5 * 60 * 1000,
//     gcTime: 30 * 60 * 1000,
//     refetchOnMount: false,
//     refetchOnWindowFocus: false,
//     refetchOnReconnect: false,
//     retry: 1,

//     // Keeps the previous result on screen while a new search resolves.
//     placeholderData: keepPreviousData,
//   });

//   /* Page accumulation now lives in the cache, not in component state. */
//   const features = useMemo(() => {
//     const all = data?.pages.flatMap((page) => page.features ?? []) ?? [];
//     // Cheap insurance against overlapping pages from the API.
//     return Array.from(new Map(all.map((f) => [f.id, f])).values());
//   }, [data]);

//   const totalCount = data?.pages[0]?.pagination?.total_count ?? 0;

//   /* ────────────────────────────────────────────────────────────
//      4. Selection reset — state only, never a request
//      ──────────────────────────────────────────────────────────── */
//   useEffect(() => {
//     // A new result set invalidates selections/pins from the old one.
//     clearProducts();
//     clearPinnedProducts();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debounced.key]);

//   useEffect(() => {
//     return () => {
//       // Unmount only. Deliberately NOT removing cached queries — that is
//       // what made every repeated search a fresh network round trip.
//       clearProducts();
//       clearPinnedProducts();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const getSatelliteName = (constellation?: string) => {
//     const satellites: Record<string, string> = {
//       PNEO: "Pléiades Neo",
//       PLEIADES: "Pléiades",
//       SPOT: "SPOT",
//       PHR: "Pléiades",
//       ELEVATION: "Elevation",
//       DMC: "DMC",
//     };
//     return satellites[constellation ?? ""] || constellation || "Satellite";
//   };

//   const mappedProducts: SelectedArchiveProduct[] = useMemo(
//     () =>
//       features.map((item) => ({
//         id: item.id,
//         name: getSatelliteName(item.properties.raw.constellation),
//         imageUrl: item.properties.image_url,
//         coordinates: item.geometry.coordinates,
//         geometry: item.geometry,
//         date: item.properties.date,
//         acquisitionDate: item.properties.raw.acquisitionDate,
//         sensor: item.properties.sensor,
//         resolution: item.properties.raw.resolution,
//         cloud_cover: item.properties.cloud_cover,
//         incidenceAngle: item.properties.incidence_angle,
//         raw: item.properties.raw,
//       })),
//     [features]
//   );

//   const allSelectedVisible =
//     selectedProducts.length > 0 &&
//     selectedProducts.every((product) => isVisible(product.id));

//   const handleSelectAll = () => {
//     const allSelected =
//       mappedProducts.length > 0 &&
//       mappedProducts.every((product) => isSelected(product.id));
//     if (allSelected) {
//       clearProducts();
//     } else {
//       selectAllProducts(mappedProducts);
//     }
//   };

//   /* Immediate — does not touch the debounce timer. */
//   const handleFetchMore = () => {
//     if (hasNextPage && !isFetchingNextPage) {
//       fetchNextPage();
//     }
//   };

//   if (!aoi) {
//     return (
//       <div className="flex h-full flex-col items-center justify-center px-5 text-center">
//         <p className="text-primary mb-5 max-w-65 text-sm font-semibold">
//           Please Create or Select AOI Before Searching.
//         </p>

//         <button className="bg-primary/10 hover:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-lg border">
//           <AoiDrawIcon />
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="relative h-full">
//       <div className="flex h-full flex-col bg-gray-50">
//         {/* HEADER */}
//         <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
//           {/* Left */}
//           <div>
//             <h2 className="text-sm font-semibold text-gray-900">
//               {totalCount} Results
//             </h2>
//             <p className="mt-0.5 text-xs text-gray-500">Archive Products</p>
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
//               Sort
//             </span>

//             <div className="relative inline-block">
//               <select
//                 id="sort"
//                 value={sortBy}
//                 onChange={(e) => setSortBy(e.target.value as SortOption)}
//                 className="focus:border-primary focus:ring-primary/20 h-8 w-44 appearance-none rounded-md border border-gray-300 bg-white pr-8 pl-3 text-sm text-gray-700 shadow-sm transition outline-none hover:border-gray-400 focus:ring-2"
//               >
//                 {sortOptions.map((option) => (
//                   <option key={option.value} value={option.value}>
//                     {option.label}
//                   </option>
//                 ))}
//               </select>

//               <svg
//                 className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500"
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 20 20"
//                 fill="currentColor"
//               >
//                 <path
//                   fillRule="evenodd"
//                   d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
//                   clipRule="evenodd"
//                 />
//               </svg>
//             </div>
//           </div>

//           {/* Right */}
//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               title="Clear Selected Products"
//               onClick={clearProducts}
//               className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
//             >
//               <Trash2 size={16} />
//             </button>

//             <div className="relative">
//               <button
//                 type="button"
//                 title="Export Products"
//                 onClick={() => setOpen((prev) => !prev)}
//                 className="hover:border-primary/20 hover:bg-primary/5 hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition"
//               >
//                 <Upload size={16} />
//               </button>

//               {open && (
//                 <div className="absolute top-full right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg">
//                   <button
//                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
//                     onClick={async () => {
//                       if (!selectedProducts.length) {
//                         toast.error(
//                           "Please select at least one product to export."
//                         );
//                         return;
//                       }

//                       try {
//                         await exportHTML({
//                           items: selectedProducts,
//                           filename: "Pleiades_Report.html",
//                         });
//                         setOpen(false);
//                       } catch (error) {
//                         logger.error(error);
//                         toast.error("Failed to export HTML.");
//                       }
//                     }}
//                   >
//                     Export HTML
//                   </button>

//                   <button
//                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
//                     onClick={async () => {
//                       if (!selectedProducts.length) {
//                         toast.error(
//                           "Please select at least one product to export."
//                         );
//                         return;
//                       }

//                       try {
//                         await exportCSV({
//                           items: selectedProducts,
//                           filename: "Pleiades_Report.csv",
//                         });
//                         setOpen(false);
//                       } catch (error) {
//                         logger.error(error);
//                         toast.error("Failed to export CSV.");
//                       }
//                     }}
//                   >
//                     Export CSV
//                   </button>

//                   <button
//                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
//                     onClick={async () => {
//                       try {
//                         if (!selectedProducts.length) {
//                           toast.error(
//                             "Please select at least one product to export."
//                           );
//                           return;
//                         }
//                         await exportKML({
//                           format: "kml",
//                           items: selectedProducts,
//                           aoi: aoi,
//                           filename: "Rectangle 1 - Pleiades 50cm.kml",
//                           lang: "en",
//                           extraInfos: {
//                             exportedBy: "Archive System",
//                             provider: "Airbus",
//                           },
//                         });
//                         setOpen(false);
//                       } catch (error) {
//                         logger.error("KML Export Error:", error);
//                         toast.error("Failed to export KML.");
//                       }
//                     }}
//                   >
//                     Export KML
//                   </button>

//                   <button
//                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
//                     onClick={async () => {
//                       if (!selectedProducts.length) {
//                         toast.error(
//                           "Please select at least one product to export."
//                         );
//                         return;
//                       }

//                       try {
//                         await exportKMZ({
//                           format: "kmz",
//                           items: selectedProducts,
//                           aoi: aoi,
//                           filename: "Rectangle 1 - Pleiades 50cm.kmz",
//                           lang: "en",
//                           extraInfos: {
//                             exportedBy: "Archive System",
//                             provider: "Airbus",
//                           },
//                         });
//                         setOpen(false);
//                       } catch (error) {
//                         logger.error("KMZ Export Error:", error);
//                         toast.error("Failed to export KMZ.");
//                       }
//                     }}
//                   >
//                     Export KMZ
//                   </button>

//                   <button
//                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
//                     onClick={async () => {
//                       if (!selectedProducts.length) {
//                         toast.error(
//                           "Please select at least one product to export."
//                         );
//                         return;
//                       }

//                       await exportShape({
//                         items: selectedProducts,
//                         aoi: aoi,
//                         filename: "Rectangle 1 - Pleiades 50cm (1).zip",
//                       });

//                       setOpen(false);
//                     }}
//                   >
//                     Export Shape
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center justify-end gap-6 bg-white px-4 py-3 shadow-sm">
//           <div className="flex items-center gap-1">
//             {/* Pin All / Clear All Pins */}
//             <button
//               type="button"
//               onClick={() => {
//                 if (pinnedProducts.length > 0) {
//                   clearPinnedProducts();
//                   toast.success("All pinned products removed");
//                 } else {
//                   selectAllPinned(mappedProducts);
//                   toast.success(`${mappedProducts.length} products pinned`);
//                 }
//               }}
//               title={
//                 pinnedProducts.length > 0 ? "Clear All Pins" : "Select All Pins"
//               }
//               className="rounded-md p-2 transition hover:bg-gray-100"
//             >
//               {pinnedProducts.length > 0 ? (
//                 <PinOff size={17} className="text-primary" />
//               ) : (
//                 <ListChecks size={17} className="text-gray-600" />
//               )}
//             </button>

//             {/* Select / Deselect All */}
//             <button
//               type="button"
//               onClick={handleSelectAll}
//               title={
//                 mappedProducts.length > 0 &&
//                   mappedProducts.every((product) => isSelected(product.id))
//                   ? "Deselect All"
//                   : "Select All"
//               }
//               className="rounded-md p-2 transition hover:bg-gray-100"
//             >
//               {mappedProducts.length > 0 &&
//                 mappedProducts.every((product) => isSelected(product.id)) ? (
//                 <CheckSquare size={17} className="text-primary" />
//               ) : (
//                 <Square size={17} className="text-gray-600" />
//               )}
//             </button>

//             {/* Show / Hide All Selected on Map */}
//             <button
//               type="button"
//               onClick={() => {
//                 if (selectedProducts.length === 0) {
//                   toast.info("Please select products first");
//                   return;
//                 }
//                 if (allSelectedVisible) {
//                   hideAllProducts();
//                   toast.success("All selected products hidden from map");
//                 } else {
//                   showSelectedProducts();
//                   toast.success(
//                     `${selectedProducts.length} products displayed on map`
//                   );
//                 }
//               }}
//               title={
//                 selectedProducts.length > 0 && allSelectedVisible
//                   ? "Hide All From Map"
//                   : "Show All On Map"
//               }
//               className="rounded-md p-2 transition hover:bg-gray-100"
//             >
//               {selectedProducts.length > 0 && allSelectedVisible ? (
//                 <Eye size={17} className="text-primary" />
//               ) : (
//                 <Eye size={17} className="text-gray-600" />
//               )}
//             </button>

//             {/* Fetch more products — immediate, never debounced */}
//             <button
//               type="button"
//               onClick={handleFetchMore}
//               disabled={!hasNextPage || isFetchingNextPage}
//               className="border-border text-primary hover:bg-primary flex h-9 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-medium transition-all duration-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {isFetchingNextPage ? (
//                 <>
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                   Loading...
//                 </>
//               ) : (
//                 <>
//                   <span>
//                     1–{features.length}
//                     {totalCount ? ` of ${totalCount}` : ""}
//                   </span>
//                   <ChevronRight className="h-4 w-4" />
//                 </>
//               )}
//             </button>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto p-3">
//           {isError && (
//             <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
//               <div className="flex items-center gap-3">
//                 <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
//                   <AlertCircle className="h-5 w-5 text-red-600" />
//                 </div>

//                 <div>
//                   <p className="text-sm font-semibold">
//                     Unable to load products
//                   </p>
//                   <p className="text-xs text-red-600">
//                     Something went wrong. Please try again.
//                   </p>
//                 </div>
//               </div>

//               {/* Immediate — bypasses the debounce entirely */}
//               <button
//                 type="button"
//                 onClick={() => refetch()}
//                 disabled={isFetching}
//                 className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
//               >
//                 Retry
//               </button>
//             </div>
//           )}

//           <div className="space-y-2">
//             {mappedProducts.map((product) => (
//               <ArchiveProductCard
//                 key={product.id}
//                 product={product}
//                 checked={isSelected(product.id)}
//                 isVisible={isVisible(product.id)}
//                 onToggleSelect={toggleProduct}
//                 onToggleVisibility={toggleVisibility}
//                 onFlyToProduct={setFlyToProduct}
//               />
//             ))}
//           </div>

//           {isLoading && (
//             <div className="space-y-2">
//               {Array.from({ length: 6 }).map((_, i) => (
//                 <ArchiveProductCardSkeleton key={i} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };