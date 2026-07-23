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
  const { selectedItems } = useProductStore();
  const { accessToken } = useAuthStore();
  const [provider, setProvider] = useState<SatelliteProvider>("airbus");
  const token = accessToken?.replace("Bearer ", "").trim() || "";
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

  const sensors = useMemo(() => {
    return [...new Set(selectedItems.map((item) => item.sensor))];
  }, [selectedItems]);

  const aoi = useMemo(() => {
    const layer = layers.find((l) => l.id === selectedAOIId);

    return layer?.geojson.geometry ?? null;
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
      }),
    [provider, startDate, endDate, cloudCoverRange, incidenceAngleRange, sensors, aoiKey, sortBy],
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

      // console.log(decrypted)
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

  // console.log("mappedProducts", products);
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
                        console.error(error);
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
                        console.error(error);
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
                        console.error("KML Export Error:", error);

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
                        console.error("KMZ Export Error:", error);

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

        <div className="flex items-center justify-between gap-6 bg-white px-4 py-3 shadow-sm">
          {/* Provider */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Provider
            </span>

            <div className="relative">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as SatelliteProvider)}
                className="focus:border-primary focus:ring-primary/20 h-8 w-36 appearance-none rounded-md border border-gray-300 bg-white pr-8 pl-3 text-sm text-gray-700 transition outline-none hover:border-gray-400 focus:ring-2"
              >
                <option value="airbus">Airbus</option>
                <option value="sentinel">Sentinel</option>
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
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArchiveProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
