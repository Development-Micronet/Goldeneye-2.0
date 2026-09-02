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

    const { openArchive, openTasking } = useMapSidebarStore();

    const handleArchive = () => {
        if (!selectedAOIId) {
            toast.error("Please select an AOI first.");
            return;
        }
        openArchive();
    };

    const handleTasking = () => {
        if (!selectedAOIId) {
            toast.error("Please select an AOI first.");
            return;
        }
        openTasking();
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
            const result = await exportAOIWithMapLibre({
                geojson: selectedAOI.geojson,

                filename,
            });

            const { file, previewUrl, bbox } = result;

            /*
             * Download the GeoTIFF to disk.
             */
            downloadFile(file, filename);

            /*
             * Add generated TIFF
             * to raster Zustand store.
             */
            const id = crypto.randomUUID();

            addRaster({
                id,

                name: filename,

                type: "tiff",

                file,

                imageUrl: previewUrl,

                displayImageUrl: previewUrl,

                displayType: "original",

                extent: bbox,

                aoi: bbox,

                projection: "EPSG:4326",

                visible: true,

                opacity: 1,

                operations: [],
            });

            toast.success("AOI GeoTIFF generated and downloaded.");

            /*
             * Navigate only AFTER
             * the raster has been added.
             */
            navigate("/analytics");
        } catch (error) {
            console.error("Failed to generate AOI GeoTIFF:", error);

            toast.error(
                error instanceof Error ? error.message : "Failed to generate AOI GeoTIFF.",
            );
        } finally {
            setLoading(false);
        }
    };

    if (!hasSearch && !hasAnalytics && !hasTasking) {
        return null;
    }

    return (
            <div className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
                {/* Archive (Search) */}
                {hasSearch && (
                    <button
                        type="button"
                        onClick={handleArchive}
                        disabled={loading || !selectedAOIId}
                        title={selectedAOIId ? "Search Archive Data" : "Select an AOI first"}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-lg transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                        title={selectedAOIId ? "Create a new Tasking request" : "Select an AOI first"}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-lg transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FiTarget size={14} />
                        <span>Tasking</span>
                    </button>
                )}
            </div>
        );
};

export default AnalyticsButton;