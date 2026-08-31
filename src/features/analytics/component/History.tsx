import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileImage, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "react-toastify";

import {
  getCompanyImages,
  getOperation,
  getPerformedOperations,
  OPERATION_KEYS,
  OPERATION_LABELS,
} from "../service/Analytics.service"

import type { CompanyImage, OperationKey } from "../service/Analytics.service";
import { useMapStore } from "../store/useMapStore";
import {
  addGeoTIFFToMap,
  downloadGeoTIFF,
  fitMapToBounds,
  removeGeoTIFFFromMap,
} from "../utils/geotiffRaster";
import type { GeoTIFFMetadata } from "../utils/geotiffRaster";
import HistoryImageCard from "./Historyimagecard";
import type { Variant } from "./Historyimagecard";

type SortOrder = "newest" | "oldest";

/**
 * A record can put several rasters on the map at once (base + detections), so
 * every layer needs its own id namespace.
 */
const layerKeyFor = (requestId: string, variant: Variant) =>
  variant === "base" ? requestId : `${requestId}__${variant}`;

const selectClass =
  "border-border text-text-muted focus:border-primary min-w-0 flex-1 rounded border bg-white px-1.5 py-1 text-[11px] outline-none";

const History = () => {
  // The global map is owned by the map component; this panel only controls layers.
  const { map } = useMapStore();

  // Keyed by layerKey (requestId or requestId__operation).
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [metadataByKey, setMetadataByKey] = useState<Record<string, GeoTIFFMetadata>>({});
  const [errorsById, setErrorsById] = useState<Record<string, string>>({});
  const [namesById, setNamesById] = useState<Record<string, string>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState<"all" | "none" | OperationKey>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [onMapOnly, setOnMapOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const activeKeysRef = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["company-images"],
    queryFn: ({ signal }) => getCompanyImages(signal),
  });

  const images = useMemo(() => data ?? [], [data]);

  /* ---------------------------------------------------------------- */
  /* Filtering                                                         */
  /* ---------------------------------------------------------------- */

  const dateOptions = useMemo(
    () =>
      Array.from(new Set(images.map((image) => image.date).filter(Boolean))).sort((a, b) =>
        b.localeCompare(a)
      ),
    [images]
  );

  const activeVariantsFor = useCallback(
    (image: CompanyImage): Set<Variant> => {
      const variants = new Set<Variant>();
      if (activeLayers.has(layerKeyFor(image.requestId, "base"))) variants.add("base");
      OPERATION_KEYS.forEach((key) => {
        if (activeLayers.has(layerKeyFor(image.requestId, key))) variants.add(key);
      });
      return variants;
    },
    [activeLayers]
  );

  const loadingVariantsFor = useCallback(
    (image: CompanyImage): Set<Variant> => {
      const variants = new Set<Variant>();
      if (loadingLayers.has(layerKeyFor(image.requestId, "base"))) variants.add("base");
      OPERATION_KEYS.forEach((key) => {
        if (loadingLayers.has(layerKeyFor(image.requestId, key))) variants.add(key);
      });
      return variants;
    },
    [loadingLayers]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matches = images.filter((image) => {
      const performed = getPerformedOperations(image);

      if (operationFilter === "none" && performed.length) return false;
      if (
        operationFilter !== "all" &&
        operationFilter !== "none" &&
        !performed.includes(operationFilter)
      ) {
        return false;
      }

      if (dateFilter !== "all" && image.date !== dateFilter) return false;

      if (onMapOnly && activeVariantsFor(image).size === 0) return false;

      if (term) {
        // Search the renamed label too, since that's what the user sees.
        const name = (namesById[image.requestId] ?? image.displayName ?? "").toLowerCase();
        const file = (image.fileName ?? "").toLowerCase();
        if (!name.includes(term) && !file.includes(term)) return false;
      }

      return true;
    });

    return matches.sort((a, b) =>
      sortOrder === "newest"
        ? (b.timestamp ?? 0) - (a.timestamp ?? 0)
        : (a.timestamp ?? 0) - (b.timestamp ?? 0)
    );
  }, [
    images,
    search,
    operationFilter,
    dateFilter,
    onMapOnly,
    sortOrder,
    namesById,
    activeVariantsFor,
  ]);

  const filtersActive =
    search.trim() !== "" || operationFilter !== "all" || dateFilter !== "all" || onMapOnly;

  const clearFilters = () => {
    setSearch("");
    setOperationFilter("all");
    setDateFilter("all");
    setOnMapOnly(false);
  };

  // Jump back to the top of the list whenever the result set changes.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [search, operationFilter, dateFilter, onMapOnly, sortOrder]);

  /* ---------------------------------------------------------------- */
  /* Map actions                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (!map) return;
      activeKeysRef.current.forEach((key) => removeGeoTIFFFromMap(map, key));
      activeKeysRef.current.clear();
    };
  }, [map]);

  const setFlag = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    on: boolean
  ) => {
    setter((previous) => {
      const next = new Set(previous);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const cogUrlFor = (image: CompanyImage, variant: Variant): string | null =>
    variant === "base" ? image.cogUrl : getOperation(image, variant)?.cogUrl ?? null;

  const handleToggleVariant = useCallback(
    async (image: CompanyImage, variant: Variant) => {
      const key = layerKeyFor(image.requestId, variant);

      // Already on the map — toggle it off.
      if (activeLayers.has(key)) {
        removeGeoTIFFFromMap(map, key);
        activeKeysRef.current.delete(key);
        setFlag(setActiveLayers, key, false);
        return;
      }

      if (!map) {
        toast.error("The map is not ready yet.");
        return;
      }

      const cogUrl = cogUrlFor(image, variant);
      if (!cogUrl) {
        setErrorsById((prev) => ({
          ...prev,
          [image.requestId]:
            variant === "base"
              ? "No GeoTIFF available."
              : `No ${OPERATION_LABELS[variant]} raster available.`,
        }));
        return;
      }

      setFlag(setLoadingLayers, key, true);
      setErrorsById((prev) => {
        const next = { ...prev };
        delete next[image.requestId];
        return next;
      });

      try {
        const result = await addGeoTIFFToMap(map, cogUrl, {
          requestId: key,
          opacity: 1,
        });

        activeKeysRef.current.add(key);
        setFlag(setActiveLayers, key, true);
        setMetadataByKey((prev) => ({ ...prev, [key]: result.metadata }));

        fitMapToBounds(map, result.bounds);
      } catch (loadError: any) {
        setErrorsById((prev) => ({
          ...prev,
          [image.requestId]: loadError?.message || "Could not display this raster.",
        }));
      } finally {
        setFlag(setLoadingLayers, key, false);
      }
    },
    [map, activeLayers]
  );

  const handleRemoveAll = useCallback(
    (image: CompanyImage) => {
      const keys = ["base" as Variant, ...OPERATION_KEYS].map((variant) =>
        layerKeyFor(image.requestId, variant)
      );

      keys.forEach((key) => {
        removeGeoTIFFFromMap(map, key);
        activeKeysRef.current.delete(key);
      });

      setActiveLayers((previous) => {
        const next = new Set(previous);
        keys.forEach((key) => next.delete(key));
        return next;
      });
    },
    [map]
  );

  /** Metadata of whichever raster of this record loaded first. */
  const metadataFor = useCallback(
    (image: CompanyImage): GeoTIFFMetadata | undefined => {
      const keys = ["base" as Variant, ...OPERATION_KEYS].map((variant) =>
        layerKeyFor(image.requestId, variant)
      );
      const found = keys.find((key) => metadataByKey[key]);
      return found ? metadataByKey[found] : undefined;
    },
    [metadataByKey]
  );

  const handleZoom = useCallback(
    (image: CompanyImage) => {
      const metadata = metadataFor(image);
      if (!map || !metadata) return;
      fitMapToBounds(map, metadata.bounds);
    },
    [map, metadataFor]
  );

  const handleDownload = useCallback(async (image: CompanyImage) => {
    if (!image.cogUrl) return;
    try {
      await downloadGeoTIFF(image.cogUrl, image.fileName);
    } catch (downloadError: any) {
      toast.error(downloadError?.message || "Could not download the GeoTIFF.");
    }
  }, []);

  const handleRename = useCallback((requestId: string, name: string) => {
    setNamesById((prev) => ({ ...prev, [requestId]: name }));
  }, []);

  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="border-border animate-pulse rounded-lg border bg-white p-2.5">
            <div className="flex gap-2.5">
              <div className="bg-primary-100 h-16 w-16 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2 py-1">
                <div className="bg-primary-100 h-2.5 w-2/3 rounded" />
                <div className="bg-primary-100 h-2 w-1/2 rounded" />
                <div className="bg-primary-100 h-2 w-1/3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-border m-3 rounded-lg border bg-white p-4 text-center">
        <p className="text-primary text-xs font-semibold">Couldn't load the archive</p>
        <p className="text-text-secondary mt-1 text-[11px]">
          {(error as Error)?.message || "The analytics service is unreachable."}
        </p>
      </div>
    );
  }

  if (!images.length) {
    return (
      <div className="border-border m-3 rounded-lg border border-dashed bg-white p-6 text-center">
        <FileImage className="text-nav-inactive mx-auto" size={22} />
        <p className="text-primary mt-2 text-xs font-semibold">No historical imagery yet</p>
        <p className="text-text-secondary mt-1 text-[11px]">
          Results you generate from an AOI will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-secondary text-[11px]">
            {filtered.length
              ? `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`
              : "No matches"}
            {filtered.length !== images.length && ` (${images.length} total)`}
          </span>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] transition ${filtersActive
                ? "border-primary bg-primary-100 text-primary"
                : "border-border text-text-muted hover:bg-primary-100"
              }`}
          >
            <SlidersHorizontal size={11} />
            Filters
          </button>
        </div>

        <div className="relative mt-2">
          <Search
            className="text-nav-inactive pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
            size={12}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or file"
            className="border-border text-text-muted focus:border-primary w-full rounded border bg-white py-1 pr-6 pl-6 text-[11px] outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="text-nav-inactive hover:text-text-muted absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1.5">
              <select
                value={operationFilter}
                onChange={(event) => setOperationFilter(event.target.value as any)}
                aria-label="Filter by detection"
                className={selectClass}
              >
                <option value="all">All detections</option>
                {OPERATION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {OPERATION_LABELS[key]}
                  </option>
                ))}
                <option value="none">No detections</option>
              </select>

              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                aria-label="Filter by date"
                className={selectClass}
              >
                <option value="all">All dates</option>
                {dateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                aria-label="Sort order"
                className={selectClass}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              <label className="text-text-muted flex shrink-0 items-center gap-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={onMapOnly}
                  onChange={(event) => setOnMapOnly(event.target.checked)}
                  className="accent-primary h-3 w-3"
                />
                On map only
              </label>
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-primary text-[11px] underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.length ? (
          filtered.map((image) => (
            <HistoryImageCard
              key={image.requestId}
              image={image}
              displayName={namesById[image.requestId] ?? image.displayName}
              activeVariants={activeVariantsFor(image)}
              loadingVariants={loadingVariantsFor(image)}
              metadata={metadataFor(image)}
              error={errorsById[image.requestId]}
              onToggleVariant={(variant) => handleToggleVariant(image, variant)}
              onZoom={() => handleZoom(image)}
              onRemoveAll={() => handleRemoveAll(image)}
              onDownload={() => handleDownload(image)}
              onRename={(name) => handleRename(image.requestId, name)}
            />
          ))
        ) : (
          <div className="border-border rounded-lg border border-dashed bg-white p-6 text-center">
            <Search className="text-nav-inactive mx-auto" size={20} />
            <p className="text-primary mt-2 text-xs font-semibold">No results match</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary mt-2 text-[11px] underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;