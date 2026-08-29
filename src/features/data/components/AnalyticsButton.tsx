import { useState } from "react";
import { FiActivity, FiLoader } from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelectedAOIStore } from "../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../store/useLayersStore";

import { exportAOIWithMapLibre, downloadFile } from "../../../utils/exportAOIGeoTIFF";
import { useRasterStore } from "../../analytics/store/useRasterStore";

const AnalyticsButton = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);

    const layers = useLayersStore((state) => state.layers);

    const addRaster = useRasterStore((state) => state.addRaster);

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

    return (
        <button
            type="button"
            onClick={handleAnalytics}
            disabled={loading || !selectedAOIId}
            title={selectedAOIId ? "Generate and download AOI GeoTIFF" : "Select an AOI first"}
            className="absolute bottom-20 left-1/2 z-50 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-lg transition hover:bg-cyan-50 disabled:cursor-not-allowed "
        >
            {loading ? (
                <FiLoader size={14} className="animate-spin" />
            ) : (
                <FiActivity size={14} />
            )}

            <span>{loading ? "Generating..." : "Analytics"}</span>
        </button>
    );
};

export default AnalyticsButton;