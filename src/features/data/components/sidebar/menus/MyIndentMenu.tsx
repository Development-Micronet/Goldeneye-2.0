import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  Crosshair,
  Eye,
  ImageOff,
  Info,
  Pin,
  RefreshCw,
  Search,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  X,
  Layers,
  Calendar,
  User as UserIcon,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { apiClient } from "../../../../../api/apiClient";
import { decryptAESGCM } from "../../../../../utils/dataDecrypt";
import { useAuthStore } from "../../../../../store/useAuthStore";
import { useMapStore } from "../../../store/useMapStore";
import { useLayersStore } from "../../../../../store/useLayersStore";
import { Slider } from "antd";
import { orderIcon } from "../../../../../assets";
import { TaskingOrderForm } from "../component/Tasking/Taskingorderform";
import type {
  AcquisitionMode,
  MissionKey,
  ProgTypeKey,
  TaskingSegment,
} from "../api/Tasking.service";

export interface IndentItem {
  indent_id?: string;
  indentId?: string;
  created_at?: string;
  indentType?: string;
  IndentType?: string;
  aoi?: {
    type: string;
    coordinates: any;
  };
  properties?: Record<string, any>;
  progTypeNames?: string;
  missions?: string;
  acquisitionMode?: string | null;
  maxCloudCover?: string | number | null;
  maxIncidenceAngle?: string | number | null;
  acquisitionStartDate?: string | null;
  acquisitionEndDate?: string | null;
  segmentKey?: string | null;
  comments?: string | null;
  customerReference?: string | null;
  spectral_processing?: string | null;
  radiometric_processing?: string | null;
  image_format?: string | null;
  pixel_coding?: string | null;
  processing_level?: string | null;
  projection_1?: string | null;
  licence?: string | null;
  dem?: string | null;
  priority?: string | null;
  emailId?: string | null;
  deliveryType?: string | null;
  username?: string | null;
  geometric_processing?: string | null;
  projection_code?: string | null;
  spectral_bands_combination?: string | null;
  orthorectification_dem_reference?: string | null;
  product_format?: string | null;
}

interface SegmentKeyAttribute {
  key: string;
  value: any;
}

const parseSegmentKey = (segmentKey?: string | null): Record<string, any> => {
  if (!segmentKey) return {};
  try {
    const parts = segmentKey.split("::");
    if (parts.length > 1) {
      const parsed: SegmentKeyAttribute[] = JSON.parse(parts[1]);
      const result: Record<string, any> = {};
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.key) {
            result[item.key] = item.value;
          }
        });
      }
      return result;
    }
  } catch (e) {
    // Ignore JSON parse error if segmentKey is formatted differently
  }
  return {};
};

const getSatelliteThumbnailUrl = (aoi?: any): string => {
  if (aoi && aoi.coordinates && Array.isArray(aoi.coordinates) && aoi.coordinates.length > 0) {
    try {
      const ring = aoi.coordinates[0];
      if (Array.isArray(ring) && ring.length > 0) {
        let minLon = 180,
          maxLon = -180,
          minLat = 90,
          maxLat = -90;
        ring.forEach((pt: number[]) => {
          if (Array.isArray(pt) && pt.length >= 2) {
            const lon = pt[0];
            const lat = pt[1];
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        });
        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;

        const zoom = 12;
        const n = Math.pow(2, zoom);
        const tileX = Math.floor(((centerLon + 180) / 360) * n);
        const latRad = (centerLat * Math.PI) / 180;
        const tileY = Math.floor(
          ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
        );

        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
      }
    } catch {
      // Fallback
    }
  }
  return "";
};

export const MyIndentMenu: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const { setFlyToProduct } = useMapStore();
  const { layers, addLayer, removeLayer, toggleLayerVisibility } = useLayersStore();

  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: "Archive Search" | "Tasking"
  const [activeTab, setActiveTab] = useState<"Archive Search" | "Tasking">("Archive Search");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [cloudCoverMin, setCloudCoverMin] = useState<number>(0);
  const [cloudCoverMax, setCloudCoverMax] = useState<number>(100);
  const [incidentAngleMin, setIncidentAngleMin] = useState<number>(0);
  const [incidentAngleMax, setIncidentAngleMax] = useState<number>(60);
  const [acqDateRange, setAcqDateRange] = useState<string>("Disabled");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Applied Filters State
  const [appliedFilters, setAppliedFilters] = useState({
    product: "",
    cloudCoverMin: 0,
    cloudCoverMax: 100,
    incidentAngleMin: 0,
    incidentAngleMax: 60,
    acqDateRange: "Disabled",
    startDate: "",
    endDate: "",
  });

  const handleAcqDateRangeChange = (val: string) => {
    setAcqDateRange(val);
    const now = new Date();
    if (val === "Last 7 Days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (val === "Last 30 Days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (val === "Last 90 Days") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (val === "Disabled") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      product: filterProduct,
      cloudCoverMin,
      cloudCoverMax,
      incidentAngleMin,
      incidentAngleMax,
      acqDateRange,
      startDate,
      endDate,
    });
  };

  const handleResetFilters = () => {
    setFilterProduct("");
    setCloudCoverMin(0);
    setCloudCoverMax(100);
    setIncidentAngleMin(0);
    setIncidentAngleMax(60);
    setAcqDateRange("Disabled");
    setStartDate("");
    setEndDate("");

    setAppliedFilters({
      product: "",
      cloudCoverMin: 0,
      cloudCoverMax: 100,
      incidentAngleMin: 0,
      incidentAngleMax: 60,
      acqDateRange: "Disabled",
      startDate: "",
      endDate: "",
    });
  };

  // Selection & Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [infoItem, setInfoItem] = useState<IndentItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<IndentItem | null>(null);
  const [orderingIndent, setOrderingIndent] = useState<IndentItem | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const token = useMemo(() => {
    return accessToken?.replace("Bearer ", "").trim() || "";
  }, [accessToken]);

  const roleName = user?.roleName?.toLowerCase() || "";
  const isAdmin = roleName === "admin" || roleName === "superadmin";

  const fetchIndents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Endpoint determination based on role
      // Admin/Superadmin: /api/adminIndent/
      // User/Tenant: /api/indent/
      const endpoint = isAdmin ? "adminIndent/" : "indent/";

      let response: any;
      try {
        response = await apiClient.get(endpoint);
      } catch (err: any) {
        // Fallback to /api/indent/ if adminIndent endpoint is unavailable
        if (isAdmin && err.response?.status === 404) {
          response = await apiClient.get("indent/");
        } else {
          throw err;
        }
      }

      let responseData = response?.data;
      if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        typeof responseData.data === "string"
      ) {
        responseData = responseData.data;
      }

      let decryptedData: any = responseData;
      if (typeof responseData === "string" && token) {
        try {
          decryptedData = await decryptAESGCM(responseData, token);
        } catch (decryptErr) {
          console.error("Failed to decrypt indent response:", decryptErr);
        }
      }

      let list: IndentItem[] = [];
      if (Array.isArray(decryptedData)) {
        list = decryptedData;
      } else if (decryptedData && typeof decryptedData === "object") {
        list =
          decryptedData.Indent ||
          decryptedData.indent ||
          decryptedData.results ||
          decryptedData.data ||
          [];
      }

      setIndents(list);
    } catch (err: any) {
      console.error("Error fetching indents:", err);
      setError(err.message || "Failed to load indent data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  // Unique product / mission names for filter dropdown
  const productOptions = useMemo(() => {
    const defaultMissions = ["PHR", "PNEO", "SPOT"];
    const set = new Set<string>(defaultMissions);
    indents.forEach((item) => {
      if (item.missions) set.add(item.missions);
    });
    return Array.from(set);
  }, [indents]);

  // Extract display metrics
  const getItemMetrics = (item: IndentItem) => {
    const seg = parseSegmentKey(item.segmentKey);

    const cloud =
      item.maxCloudCover ?? seg.maxCloudCover ?? item.properties?.maxCloudCover ?? null;
    const cloudVal = cloud !== null && cloud !== undefined ? `${cloud}` : "4.67";

    const inc =
      item.maxIncidenceAngle ??
      seg.maxIncidenceAngle ??
      item.properties?.maxIncidenceAngle ??
      null;
    const incVal = inc !== null && inc !== undefined ? `${inc}` : "15.57";

    let resVal = "0.3m";
    const mission = (item.missions || "").toUpperCase();
    const spectral = (item.spectral_processing || "").toLowerCase();
    if (mission.includes("NEO") || mission.includes("PNEO") || spectral.includes("30cm")) {
      resVal = "0.3m";
    } else if (mission.includes("SPOT")) {
      resVal = "1.5m";
    } else if (spectral.includes("50cm") || mission.includes("PLEIADES") || mission.includes("PHR")) {
      resVal = "0.5m";
    }

    return { resVal, incVal, cloudVal };
  };

  // Filtered indents based on Tab, Search Term, and Applied Filter settings
  const filteredIndents = useMemo(() => {
    return indents.filter((item) => {
      const itemType = (item.indentType || item.IndentType || "").toLowerCase();

      // Tab filtering
      if (activeTab === "Tasking") {
        if (!itemType.includes("task")) return false;
      } else {
        // "Archive Search"
        if (itemType.includes("task")) return false;
      }

      // Customer Reference Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const ref = (item.customerReference || "").toLowerCase();
        const idStr = (item.indent_id || item.indentId || "").toLowerCase();
        const missionStr = (item.missions || "").toLowerCase();
        const userStr = (item.username || item.emailId || "").toLowerCase();
        const matches =
          ref.includes(term) ||
          idStr.includes(term) ||
          missionStr.includes(term) ||
          userStr.includes(term);
        if (!matches) return false;
      }

      // Filter: Product
      if (appliedFilters.product) {
        const pFilter = appliedFilters.product.toLowerCase();
        const missionStr = (item.missions || "").toLowerCase();
        const refStr = (item.customerReference || "").toLowerCase();

        let matches = missionStr.includes(pFilter) || refStr.includes(pFilter);
        if (!matches) {
          if (pFilter === "phr" && (missionStr.includes("pleiades") || missionStr.includes("phr"))) {
            matches = true;
          } else if (pFilter === "pneo" && (missionStr.includes("neo") || missionStr.includes("pneo"))) {
            matches = true;
          } else if (pFilter === "spot" && missionStr.includes("spot")) {
            matches = true;
          }
        }
        if (!matches) return false;
      }

      // Filter: Cloud Cover & Incident Angle
      const { incVal, cloudVal } = getItemMetrics(item);
      const cloudNum = parseFloat(cloudVal);
      const incNum = parseFloat(incVal);

      if (!isNaN(cloudNum)) {
        if (
          cloudNum < appliedFilters.cloudCoverMin ||
          cloudNum > appliedFilters.cloudCoverMax
        ) {
          return false;
        }
      }

      if (!isNaN(incNum)) {
        if (
          incNum < appliedFilters.incidentAngleMin ||
          incNum > appliedFilters.incidentAngleMax
        ) {
          return false;
        }
      }

      // Filter: Date Range
      if (appliedFilters.acqDateRange !== "Disabled") {
        const itemDate = new Date(item.created_at || 0).getTime();
        if (appliedFilters.startDate) {
          const fromTime = new Date(appliedFilters.startDate).getTime();
          if (itemDate < fromTime) return false;
        }
        if (appliedFilters.endDate) {
          const toTime = new Date(appliedFilters.endDate + "T23:59:59").getTime();
          if (itemDate > toTime) return false;
        }
      }

      return true;
    });
  }, [indents, activeTab, searchTerm, appliedFilters]);

  // Tab counts
  const taskingCount = useMemo(() => {
    return indents.filter((item) =>
      (item.indentType || item.IndentType || "").toLowerCase().includes("task"),
    ).length;
  }, [indents]);

  const archiveCount = useMemo(() => {
    return indents.filter(
      (item) => !(item.indentType || item.IndentType || "").toLowerCase().includes("task"),
    ).length;
  }, [indents]);

  // Selection logic
  const allFilteredSelected =
    filteredIndents.length > 0 &&
    filteredIndents.every((item) => {
      const id = item.indent_id || item.indentId;
      return id && selectedIds.has(id);
    });

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredIndents.forEach((item) => {
        const id = item.indent_id || item.indentId;
        if (id) next.add(id);
      });
      setSelectedIds(next);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Map FlyTo AOI
  const handleFlyTo = (item: IndentItem) => {
    if (item.aoi) {
      setFlyToProduct({ geometry: item.aoi } as any);
    }
  };

  // Pin item to map layers
  const getItemLayerId = (item: IndentItem) => {
    const id = item.indent_id || item.indentId;
    return `indent-layer-${id}`;
  };

  const isItemPinned = (item: IndentItem) => {
    const id = getItemLayerId(item);
    return layers.some((l) => l.id === id);
  };

  const togglePinItem = (item: IndentItem) => {
    const layerId = getItemLayerId(item);
    const existing = layers.find((l) => l.id === layerId);
    if (existing) {
      removeLayer(layerId);
    } else if (item.aoi) {
      const labelName = item.customerReference || item.indent_id || item.indentId || "Indent AOI";
      addLayer({
        id: layerId,
        label: labelName,
        type: "Polygon",
        geojson: {
          type: "Feature",
          geometry: item.aoi,
          properties: { ...item },
        },
        visible: true,
      } as any);
    }
  };

  // Toggle layer visibility
  const toggleItemVisibility = (item: IndentItem) => {
    const layerId = getItemLayerId(item);
    const existing = layers.find((l) => l.id === layerId);
    if (existing) {
      toggleLayerVisibility(layerId);
    } else {
      // Pin and show
      togglePinItem(item);
    }
  };

  // Bulk Pin
  const pinSelectedItems = () => {
    filteredIndents.forEach((item) => {
      const id = item.indent_id || item.indentId;
      if (id && selectedIds.has(id) && !isItemPinned(item)) {
        togglePinItem(item);
      }
    });
  };

  // Bulk Toggle Visibility
  const toggleSelectedVisibility = () => {
    filteredIndents.forEach((item) => {
      const id = item.indent_id || item.indentId;
      if (id && selectedIds.has(id)) {
        toggleItemVisibility(item);
      }
    });
  };

  // Delete single indent
  const confirmDeleteSingle = (item: IndentItem) => {
    setDeleteConfirmItem(item);
  };

  const executeDeleteSingle = async () => {
    if (!deleteConfirmItem) return;
    const id = deleteConfirmItem.indent_id || deleteConfirmItem.indentId;
    if (!id) return;

    try {
      await apiClient.delete(`indent/${id}/`);
      setIndents((prev) => prev.filter((i) => (i.indent_id || i.indentId) !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Remove from map if pinned
      removeLayer(getItemLayerId(deleteConfirmItem));
    } catch (err: any) {
      console.error("Failed to delete indent:", err);
      alert(err.response?.data?.message || "Failed to delete indent. Please try again.");
    } finally {
      setDeleteConfirmItem(null);
    }
  };

  // Bulk Delete
  const executeBulkDelete = async () => {
    setIsBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    try {
      await Promise.all(
        idsToDelete.map(async (id) => {
          try {
            await apiClient.delete(`indent/${id}/`);
          } catch (e) {
            console.error(`Failed to delete indent ${id}`, e);
          }
        }),
      );

      setIndents((prev) =>
        prev.filter((i) => {
          const id = i.indent_id || i.indentId;
          return !id || !selectedIds.has(id);
        }),
      );
      // Remove map layers
      idsToDelete.forEach((id) => removeLayer(`indent-layer-${id}`));
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // Format date helper
  const formatDateString = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toUTCString();
    } catch {
      return dateStr;
    }
  };

  // Helper to extract polygon coordinate rings from AOI
  const getRings = (aoi: any): number[][][] => {
    if (!aoi) return [];
    const geom = aoi.geometry || aoi;
    if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      return geom.coordinates;
    }
    if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
      return geom.coordinates[0] || [];
    }
    if (Array.isArray(aoi.coordinates)) {
      return aoi.coordinates;
    }
    return [];
  };

  // Construct TaskingOrderForm props from IndentItem
  const buildTaskingOrderProps = (item: IndentItem) => {
    const seg = parseSegmentKey(item.segmentKey);
    const acqPeriod = (seg.acqPeriod || "").split(" ");
    const acqStart =
      item.acquisitionStartDate || acqPeriod[0] || item.created_at || new Date().toISOString();
    const acqEnd = item.acquisitionEndDate || acqPeriod[1] || acqStart;
    const orderDeadline = seg.orderDeadLine || item.created_at || new Date().toISOString();
    const incidenceAngle = Number(item.maxIncidenceAngle ?? seg.maxIncidenceAngle ?? 50);
    const cloudCover = Number(item.maxCloudCover ?? seg.maxCloudCover ?? 10);

    let missionKey: MissionKey = "PLEIADES";
    const m = (item.missions || "").toUpperCase();
    if (m.includes("NEO") || m.includes("PNEO")) {
      missionKey = "PLEIADESNEO";
    } else if (m.includes("SPOT")) {
      missionKey = "SPOT";
    } else if (m.includes("PLEIADES") || m.includes("PHR")) {
      missionKey = "PLEIADES";
    }

    let progTypeKey: ProgTypeKey = "ONEDAY";
    if ((item.progTypeNames || "").toUpperCase().includes("NOW")) {
      progTypeKey = "ONENOW";
    }

    let mode: AcquisitionMode = "MONO";
    const acqMode = (item.acquisitionMode || "").toUpperCase();
    if (acqMode === "STEREO" || acqMode === "TRI") {
      mode = acqMode;
    }

    const segment: TaskingSegment = {
      id: item.indent_id || item.indentId || `seg-${Date.now()}`,
      footprint: { geometry: seg.geometryWkt || "", center: "" },
      instrumentMode: mode,
      orderDeadline,
      extendedAngle: Boolean(seg.extendedAngle),
      acquisitionStartDate: acqStart,
      acquisitionEndDate: acqEnd,
      incidenceAngle,
      segmentKey: item.segmentKey || "",
      acrossTrackIncidenceAngle: incidenceAngle,
    };

    const rings = getRings(item.aoi);

    return {
      aoiLabel: item.customerReference || item.indent_id || "Area of interest",
      rings,
      mission: missionKey,
      progType: progTypeKey,
      acquisitionMode: mode,
      segment,
      startDate: acqStart.slice(0, 10),
      endDate: acqEnd.slice(0, 10),
      cloudCover,
      maxIncidence: incidenceAngle,
    };
  };

  // If ordering a Tasking indent, render the existing TaskingOrderForm
  if (orderingIndent) {
    const orderProps = buildTaskingOrderProps(orderingIndent);
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setOrderingIndent(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#106070] transition hover:text-[#0b4754]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Indent</span>
          </button>
          <span className="truncate text-xs font-medium text-gray-500 max-w-[200px]">
            {orderingIndent.missions || orderingIndent.customerReference || orderingIndent.indent_id}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TaskingOrderForm
            {...orderProps}
            onCancel={() => setOrderingIndent(null)}
            onSubmitted={() => {
              setOrderingIndent(null);
              fetchIndents();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white text-gray-800 select-none">
      {/* Top Header Tabs */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white px-2">
        <button
          onClick={() => setActiveTab("Archive Search")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${
            activeTab === "Archive Search"
              ? "border-b-2 border-[#106070] text-[#106070]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Archive Search {archiveCount > 0 && `(${archiveCount})`}
        </button>
        <button
          onClick={() => setActiveTab("Tasking")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${
            activeTab === "Tasking"
              ? "border-b-2 border-[#106070] text-[#106070]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Tasking {taskingCount > 0 && `(${taskingCount})`}
        </button>
      </div>

      {/* Customer Reference Search Bar */}
      <div className="flex-shrink-0 border-b border-gray-100 p-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">Customer Reference</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Customer Reference"
              className="w-full rounded border border-gray-300 py-1.5 pr-8 pl-3 text-xs text-gray-800 placeholder-gray-400 focus:border-[#106070] focus:ring-1 focus:ring-[#106070] focus:outline-none"
            />
            <button
              onClick={() => {}}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={fetchIndents}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            title="Refresh Indent List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-800 text-sm">Filter</span>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="font-medium text-[#106070] underline hover:text-[#0b4754] transition"
          >
            {showFilter ? "Hide Filter" : "Show Filter"}
          </button>
        </div>

        {/* Expanded Filter Panel matching mockup */}
        {showFilter && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3.5 text-xs shadow-xs space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* Products */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">Products</label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-700 focus:border-[#106070] focus:outline-none"
                >
                  <option value="">Select Product</option>
                  {productOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cloud Cover (%) */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">Cloud Cover (%)</label>
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <input
                    type="number"
                    min={0}
                    max={cloudCoverMax}
                    value={cloudCoverMin}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(Number(e.target.value), cloudCoverMax));
                      setCloudCoverMin(val);
                    }}
                    className="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-center text-xs focus:border-[#106070] focus:outline-none"
                  />
                  <span className="text-gray-400 font-medium">-</span>
                  <input
                    type="number"
                    min={cloudCoverMin}
                    max={100}
                    value={cloudCoverMax}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(Number(e.target.value), cloudCoverMin));
                      setCloudCoverMax(val);
                    }}
                    className="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-center text-xs focus:border-[#106070] focus:outline-none"
                  />
                  <span className="font-semibold text-gray-600 ml-0.5">%</span>
                </div>
                <div className="px-1.5 py-0.5">
                  <Slider
                    range
                    min={0}
                    max={100}
                    value={[cloudCoverMin, cloudCoverMax]}
                    onChange={(val) => {
                      if (Array.isArray(val)) {
                        setCloudCoverMin(val[0]);
                        setCloudCoverMax(val[1]);
                      }
                    }}
                    styles={{
                      track: {
                        backgroundColor: "#60a5fa",
                        height: 4,
                      },
                      handle: {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.25)",
                      },
                      rail: {
                        backgroundColor: "#e2e8f0",
                        height: 4,
                      },
                    }}
                  />
                </div>
              </div>

              {/* Incident Angle (°) */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">Incident Angle (°)</label>
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <input
                    type="number"
                    min={0}
                    max={incidentAngleMax}
                    value={incidentAngleMin}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(Number(e.target.value), incidentAngleMax));
                      setIncidentAngleMin(val);
                    }}
                    className="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-center text-xs focus:border-[#106070] focus:outline-none"
                  />
                  <span className="text-gray-400 font-medium">-</span>
                  <input
                    type="number"
                    min={incidentAngleMin}
                    max={60}
                    value={incidentAngleMax}
                    onChange={(e) => {
                      const val = Math.min(60, Math.max(Number(e.target.value), incidentAngleMin));
                      setIncidentAngleMax(val);
                    }}
                    className="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-center text-xs focus:border-[#106070] focus:outline-none"
                  />
                  <span className="font-semibold text-gray-600 ml-0.5">°</span>
                </div>
                <div className="px-1.5 py-0.5">
                  <Slider
                    range
                    min={0}
                    max={60}
                    value={[incidentAngleMin, incidentAngleMax]}
                    onChange={(val) => {
                      if (Array.isArray(val)) {
                        setIncidentAngleMin(val[0]);
                        setIncidentAngleMax(val[1]);
                      }
                    }}
                    styles={{
                      track: {
                        backgroundColor: "#60a5fa",
                        height: 4,
                      },
                      handle: {
                        borderColor: "#3b82f6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.25)",
                      },
                      rail: {
                        backgroundColor: "#e2e8f0",
                        height: 4,
                      },
                    }}
                  />
                </div>
              </div>

              {/* Acquisition Date Range */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">Acquisition Date Range</label>
                <select
                  value={acqDateRange}
                  onChange={(e) => handleAcqDateRangeChange(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-700 focus:border-[#106070] focus:outline-none"
                >
                  <option value="Disabled">Disabled</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 90 Days">Last 90 Days</option>
                  <option value="Custom Range">Custom Range</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">Start Date</label>
                <input
                  type="date"
                  disabled={acqDateRange === "Disabled"}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="w-full rounded border border-gray-300 bg-white py-1.5 px-2 text-xs text-gray-700 focus:border-[#106070] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="mb-1 block font-semibold text-gray-700">End Date</label>
                <input
                  type="date"
                  disabled={acqDateRange === "Disabled"}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="w-full rounded border border-gray-300 bg-white py-1.5 px-2 text-xs text-gray-700 focus:border-[#106070] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleResetFilters}
                className="rounded-full border border-[#106070] bg-white px-5 py-1.5 text-xs font-semibold text-[#106070] hover:bg-teal-50 transition"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="rounded-full bg-[#2c686e] px-6 py-1.5 text-xs font-semibold text-white hover:bg-[#1f4b50] transition shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar Above List */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#106070]"
          />
          <span className="text-xs text-gray-600">
            {selectedIds.size > 0 ? `${selectedIds.size} Selected` : ""}
          </span>
        </div>

        <div className="flex items-center gap-3 text-gray-500">
          <button
            onClick={pinSelectedItems}
            disabled={selectedIds.size === 0}
            className="p-1 transition hover:text-[#106070] disabled:cursor-not-allowed disabled:opacity-40"
            title="Pin Selected to Map"
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSelectedVisibility}
            disabled={selectedIds.size === 0}
            className="p-1 transition hover:text-[#106070] disabled:cursor-not-allowed disabled:opacity-40"
            title="Toggle Selected Visibility"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={selectedIds.size === 0}
            className="p-1 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            title="Delete Selected"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Indent List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#106070]" />
            <span className="text-xs">Loading indents...</span>
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="text-xs font-medium text-red-600">{error}</p>
            <button
              onClick={fetchIndents}
              className="mt-3 rounded bg-[#106070] px-3 py-1 text-xs text-white hover:bg-[#0b4754]"
            >
              Retry
            </button>
          </div>
        ) : filteredIndents.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-gray-400">
            <Layers className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-xs font-medium text-gray-500">No Indents Found</p>
            <p className="text-[11px] text-gray-400">
              {searchTerm || filterProduct || appliedFilters.product
                ? "Try clearing search or filters."
                : "No indents available in this view."}
            </p>
          </div>
        ) : (
          filteredIndents.map((item) => {
            const id = item.indent_id || item.indentId || Math.random().toString();
            const isChecked = selectedIds.has(id);
            const isPinned = isItemPinned(item);
            const title = item.missions || "PLEIADES";
            const dateStr = formatDateString(item.created_at);
            const { resVal, incVal, cloudVal } = getItemMetrics(item);
            const tileUrl = getSatelliteThumbnailUrl(item.aoi);
            const hasImgError = imgErrors[id];

            return (
              <div
                key={id}
                className={`group transition duration-150 ${
                  isChecked ? "bg-[#106070]/5" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail Container */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                    <button
                      onClick={() => toggleSelectItem(id)}
                      className={`absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-sm border transition ${
                        isChecked
                          ? "border-[#106070] bg-[#106070] text-white"
                          : "border-white bg-white/90 shadow-sm"
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>

                    {tileUrl && !hasImgError ? (
                      <img
                        src={tileUrl}
                        alt={title}
                        onError={() => setImgErrors((prev) => ({ ...prev, [id]: true }))}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-800 to-cyan-900 text-white">
                        <ImageOff className="h-5 w-5 opacity-70" />
                        <span className="mt-1 text-[9px] font-semibold tracking-wider uppercase opacity-80">
                          {title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content Details */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="truncate text-xs font-semibold text-[#106070] sm:text-sm" title={title}>
                          {title}
                        </h3>
                        {item.customerReference && (
                          <span className="flex-shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                            {item.customerReference}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-[11px] text-gray-500">{dateStr}</p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-600">
                        <span>
                          <span className="font-medium text-gray-700">Res:</span> {resVal}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>
                          <span className="font-medium text-gray-700">IncAng (°):</span> {incVal}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>
                          <span className="font-medium text-gray-700">Cloud (%):</span> {cloudVal}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Card Action Buttons */}
                    <div className="mt-2 flex items-center justify-between text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFlyTo(item)}
                          className="rounded p-1 transition hover:bg-gray-100 hover:text-[#106070]"
                          title="Zoom to AOI"
                        >
                          <Crosshair className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => togglePinItem(item)}
                          className={`rounded p-1 transition hover:bg-gray-100 ${
                            isPinned ? "text-[#106070]" : "hover:text-[#106070]"
                          }`}
                          title={isPinned ? "Unpin Layer" : "Pin Layer to Map"}
                        >
                          <Pin className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => toggleItemVisibility(item)}
                          className={`rounded p-1 transition hover:bg-gray-100 ${
                            isPinned ? "text-[#106070]" : "hover:text-[#106070]"
                          }`}
                          title="Toggle Layer Visibility"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => confirmDeleteSingle(item)}
                          className="rounded p-1 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete Indent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* Place Order icon for Tasking indents */}
                        {((item.indentType || item.IndentType || "").toLowerCase().includes("task") ||
                          activeTab === "Tasking") && (
                          <button
                            onClick={() => setOrderingIndent(item)}
                            className="rounded p-1 transition hover:bg-gray-100 hover:opacity-80"
                            title="Place Order"
                          >
                            <img src={orderIcon} alt="Order" className="h-4 w-4 object-contain" />
                          </button>
                        )}

                        <button
                          onClick={() => setInfoItem(item)}
                          className="rounded p-1 transition hover:bg-gray-100 hover:text-[#106070]"
                          title="View Full Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>

                      {item.indentType && (
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          {item.indentType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Details Modal */}
      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#106070] to-cyan-800 px-5 py-3.5 text-white">
              <div>
                <h3 className="text-base font-bold">
                  {infoItem.missions || infoItem.customerReference || "Indent Details"}
                </h3>
                <p className="text-xs text-teal-100">
                  ID: {infoItem.indent_id || infoItem.indentId || "-"}
                </p>
              </div>
              <button
                onClick={() => setInfoItem(null)}
                className="rounded-full p-1 text-teal-100 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-5 space-y-4 text-xs">
              {/* General Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <div>
                  <span className="font-semibold text-gray-500">Indent Type:</span>
                  <p className="font-medium text-gray-800">{infoItem.indentType || infoItem.IndentType || "-"}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Customer Reference:</span>
                  <p className="font-medium text-gray-800">{infoItem.customerReference || "-"}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Created At:</span>
                  <p className="font-medium text-gray-800">{formatDateString(infoItem.created_at)}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Username:</span>
                  <p className="font-medium text-gray-800">{infoItem.username || infoItem.emailId || "-"}</p>
                </div>
              </div>

              {/* Product Specifications */}
              <div>
                <h4 className="mb-2 font-bold text-[#106070] border-b pb-1">Specifications</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
                  <div>
                    <span className="text-gray-500">Spectral Processing:</span>
                    <p className="font-medium">{infoItem.spectral_processing || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Radiometric Processing:</span>
                    <p className="font-medium">{infoItem.radiometric_processing || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Image Format:</span>
                    <p className="font-medium">{infoItem.image_format || infoItem.product_format || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pixel Coding:</span>
                    <p className="font-medium">{infoItem.pixel_coding || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Processing Level:</span>
                    <p className="font-medium">{infoItem.processing_level || infoItem.geometric_processing || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Projection:</span>
                    <p className="font-medium">{infoItem.projection_1 || infoItem.projection_code || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Licence:</span>
                    <p className="font-medium">{infoItem.licence || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">DEM Reference:</span>
                    <p className="font-medium">{infoItem.dem || infoItem.orthorectification_dem_reference || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Delivery Type:</span>
                    <p className="font-medium">{infoItem.deliveryType || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Program Type:</span>
                    <p className="font-medium">{infoItem.progTypeNames || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Segment Key Parsed Details */}
              {infoItem.segmentKey && (
                <div>
                  <h4 className="mb-2 font-bold text-[#106070] border-b pb-1">Segment Attributes</h4>
                  <div className="rounded bg-gray-50 p-2.5 space-y-1 text-gray-700">
                    {Object.entries(parseSegmentKey(infoItem.segmentKey)).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-gray-100 last:border-0 py-0.5">
                        <span className="font-medium text-gray-500">{k}:</span>
                        <span className="font-mono text-gray-800 text-[11px] max-w-[60%] truncate" title={String(v)}>
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AOI GeoJSON preview */}
              {infoItem.aoi && (
                <div>
                  <h4 className="mb-2 font-bold text-[#106070] border-b pb-1">AOI Geometry (GeoJSON)</h4>
                  <pre className="max-h-32 overflow-x-auto rounded border border-gray-200 bg-gray-900 p-2 text-[10px] text-green-400">
                    {JSON.stringify(infoItem.aoi, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                onClick={() => setInfoItem(null)}
                className="rounded bg-[#106070] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0b4754]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-gray-800">Confirm Delete</h3>
            <p className="mt-2 text-xs text-gray-600">
              Are you sure you want to delete indent{" "}
              <span className="font-semibold text-gray-900">
                "{deleteConfirmItem.customerReference || deleteConfirmItem.indent_id}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteSingle}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-gray-800">Confirm Bulk Delete</h3>
            <p className="mt-2 text-xs text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">{selectedIds.size}</span> selected indents?
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isBulkDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

