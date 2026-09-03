import { useState } from "react";
// import { FiActivity, FiLoader } from "react-icons/fi";
import {
  FiActivity,
  FiArchive,
  FiTarget,
  FiLoader,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelectedAOIStore } from "../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../store/useLayersStore";
import { useMapSidebarStore } from "../hooks/useMapSidebarStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { usePlanStore } from "../hooks/usePlanStore";

import { exportAOIWithMapLibre, downloadFile } from "../../../utils/exportAOIGeoTIFF";
import { useRasterStore } from "../../analytics/store/useRasterStore";

const AnalyticsButton = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const user = useAuthStore((state) => state.user);
    const roleName = user?.roleName?.toLowerCase() || "user";
    const plan = usePlanStore((state) => state.plan);
    const allowedServices = plan?.services ?? [];

    const isSuperAdmin = roleName === "superadmin";

    // Permission checks according to plan services
    const hasSearch =
      isSuperAdmin ||
      allowedServices.length === 0 ||
      allowedServices.some((s) => s.toLowerCase() === "search");

    const hasAnalytics =
      isSuperAdmin ||
      allowedServices.some((s) => s.toLowerCase() === "analytics");

    const hasTasking =
      isSuperAdmin ||
      allowedServices.length === 0 ||
      allowedServices.some((s) => s.toLowerCase() === "tasking");

    const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);

    const layers = useLayersStore((state) => state.layers);

    const addRaster = useRasterStore((state) => state.addRaster);

    const { activeIndex, toggleArchive, toggleTasking } = useMapSidebarStore();

    const handleArchive = () => {
        if (!selectedAOIId) {
            toast.error("Please select an AOI first.");
            return;
        }
        toggleArchive();
    };

    const handleTasking = () => {
        if (!selectedAOIId) {
            toast.error("Please select an AOI first.");
            return;
        }
        toggleTasking();
    };

    const handleAnalytics = async () => {
        if (!selectedAOIId) {
            toast.error("Please select an AOI first.");

            return;
        }

        const selectedAOI = layers.find((layer) => layer.id === selectedAOIId);

        if (!selectedAOI) {
            toast.error("Selected AOI not found.");

            return;
        }

        try {
            setLoading(true);

            const filename = `${selectedAOI.label || "AOI"}-analytics.tif`.replace(
                /[^a-zA-Z0-9._-]/g,
                "_",
            );

            /*
             * IMPORTANT:
             *
             * OpenLayers map is NOT passed here.
             *
             * We only pass the AOI GeoJSON.
             */
            const tifBlob = await exportAOIWithMapLibre(selectedAOI.geojson);

            // Optional direct download
            downloadFile(tifBlob, filename);

            const url = URL.createObjectURL(tifBlob);

            addRaster({
                id: crypto.randomUUID(),
                name: filename,
                imageUrl: url,
                aoi: selectedAOI.geojson,
                opacity: 0.85,
                visible: true,
                projection: "EPSG:3857",
            });

            navigate("/analytics");
        } catch (error) {
            console.error("Failed to generate analytics raster:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to generate analytics raster.",
            );
        } finally {
            setLoading(false);
        }
    };

    if (!hasSearch && !hasAnalytics && !hasTasking) {
        return null;
    }

    const isArchiveOpen = activeIndex === 0;
    const isTaskingOpen = activeIndex === 1;

    return (
            <div className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
                {/* Archive (Search) */}
                {hasSearch && (
                    <button
                        type="button"
                        onClick={handleArchive}
                        disabled={loading || !selectedAOIId}
                        title={
                            !selectedAOIId
                                ? "Select an AOI first"
                                : isArchiveOpen
                                  ? "Close Archive Menu"
                                  : "Search Archive Data"
                        }
                        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isArchiveOpen
                                ? "border-primary bg-primary text-white hover:bg-[#1f4e57]"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-cyan-50"
                        }`}
                    >
                        <FiArchive size={14} />
                        <span>Archive</span>
                    </button>
                )}

                {/* Analytics */}
                {hasAnalytics && (
                    <button
                        type="button"
                        onClick={handleAnalytics}
                        disabled={loading || !selectedAOIId}
                        title={
                            selectedAOIId
                                ? "Generate and download AOI GeoTIFF"
                                : "Select an AOI first"
                        }
                        className="flex h-9 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-lg transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <FiLoader size={14} className="animate-spin" />
                        ) : (
                            <FiActivity size={14} />
                        )}
                        <span>{loading ? "Generating..." : "Analytics"}</span>
                    </button>
                )}

                {/* Tasking */}
                {hasTasking && (
                    <button
                        type="button"
                        onClick={handleTasking}
                        disabled={!selectedAOIId}
                        title={
                            !selectedAOIId
                                ? "Select an AOI first"
                                : isTaskingOpen
                                  ? "Close Tasking Menu"
                                  : "Create a new Tasking request"
                        }
                        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isTaskingOpen
                                ? "border-primary bg-primary text-white hover:bg-[#1f4e57]"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-cyan-50"
                        }`}
                    >
                        <FiTarget size={14} />
                        <span>Tasking</span>
                    </button>
                )}
            </div>
        );
};

export default AnalyticsButton;