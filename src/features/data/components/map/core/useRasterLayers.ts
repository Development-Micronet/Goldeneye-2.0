import { useEffect } from "react";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import { transform } from "ol/proj";
import { useRasterStore } from "../../../hooks/useRasterStore";
import { ensureProjection } from "../../../../../utils/rasterfunctions";
import useZoomStore from "../../../hooks/useZoomStore";
import { get as getProjection } from 'ol/proj';

export const useRasterLayers = (mapState: any) => {
    const { zoom, setZoom, setMaxZoom, maxZoom } = useZoomStore();
    const fitRasterId = useRasterStore((state) => state.fitRasterId);
    const rasters = useRasterStore(
        (state) => state.rasters
    );
    const setFitRasterId = useRasterStore((state) => state.setFitRasterId);

    useEffect(() => {
        const map = mapState;

        if (!map || !rasters.length) {
            return;
        }


        const rasterLayers = rasters.map((raster) => {

            const sourceProjCode =
                raster.projection || "EPSG:32643";


            ensureProjection(sourceProjCode);


            const imageUrl =
                raster.displayImageUrl ||
                raster.imageUrl;


            const imageSource = new ImageStatic({
                url: imageUrl,
                imageExtent: raster.aoi,
                projection: sourceProjCode,
                crossOrigin: "anonymous",
            });


            const layer = new ImageLayer({
                source: imageSource,
                opacity: raster.opacity ?? 1,
                visible: raster.visible !== false,
                zIndex: 999,
            });


            map.addLayer(layer);


            if (raster.aoi) {

                const view = map.getView();


                const centerUTM = [
                    (raster.aoi[0] + raster.aoi[2]) / 2,
                    (raster.aoi[1] + raster.aoi[3]) / 2,
                ];


                const centerLonLat = transform(
                    centerUTM,
                    sourceProjCode,
                    view.getProjection()
                );


                view.setCenter(centerLonLat);
                view.setZoom(16);

            }


            return layer;

        });


        return () => {
            rasterLayers.forEach((layer) => {
                map.removeLayer(layer);
            });
        };


    }, [
        mapState,
        rasters,
    ]);
    useEffect(() => {
        // console.log("[Raster Effect] Triggered. mapState exists:", !!mapState, "rasters length:", rasters.length);
        const map = mapState;
        if (!map || !rasters.length) {
            // console.log("[Raster Effect] Returning early (map or rasters missing).");
            return;
        }

        // Keep track of created layers for cleanup
        const rasterLayers = rasters.map(raster => {
            // console.log(`[Raster Effect] Processing raster ${raster.id}`, raster);
            const sourceProjCode = raster.projection || "EPSG:32643";

            ensureProjection(sourceProjCode);

            const projObj = getProjection(sourceProjCode);
            if (projObj && !projObj.getExtent()) {
                projObj.setExtent(raster.aoi);
                // console.log(`[Raster Effect] Set extent for ${sourceProjCode} to`, raster.aoi);
            }

            // Since the backend only runs gdal_translate to PNG (and NOT gdalwarp),
            // the PNG is STILL in UTM! We must let OpenLayers reproject it automatically.
            const imageSource = new ImageStatic({
                url: raster.imageUrl,
                imageExtent: raster.aoi,        // The original UTM bounds
                projection: sourceProjCode,     // The original UTM projection
                crossOrigin: "anonymous"        // Critical for client-side reprojection
            });

            // imageSource.on('imageloadstart', () => console.log(`[Raster Effect] Image load START: ${raster.imageUrl}`));
            // imageSource.on('imageloadend', () => console.log(`[Raster Effect] Image load END: ${raster.imageUrl}`));
            // imageSource.on('imageloaderror', (e) => console.error(`[Raster Effect] Image load ERROR: ${raster.imageUrl}`, e));

            const layer = new ImageLayer({
                source: imageSource,
                opacity: raster.opacity ?? 1,
                visible: raster.visible !== false,
                zIndex: 999
            });
            const view = map.getView();
            // console.log(`[Raster Effect] Adding layer to map for raster ${raster.id}. UTM Extent:`, raster.aoi);
            map.addLayer(layer);
            // Calculate the exact center of the UTM bounding box
            const centerUTM = [
                (raster.aoi[0] + raster.aoi[2]) / 2,
                (raster.aoi[1] + raster.aoi[3]) / 2
            ];
            // Transform just the center point to the map's projection
            const centerLonLat = transform(centerUTM, sourceProjCode, view.getProjection());

            // CRITICAL: We must increase the store's maxZoom first, otherwise the map's global
            // zoom synchronization effect will instantly cancel our zoom and force it back to 18!
            // setMaxZoom(16);
            // setZoom(16);

            // Instantly set the center and zoom to avoid the animation being interrupted
            // mid-flight by the React state synchronizer effect.
            view.setCenter(centerLonLat);
            view.setZoom(18);
            setMaxZoom(22);
            return layer;
        });

        return () => {
            // console.log("[Raster Effect] Cleanup - removing layers", rasterLayers.length);
            rasterLayers.forEach(layer => map.removeLayer(layer));
        };
    }, [rasters, mapState]);

    // zoom-to-layer
    useEffect(() => {
        const map = mapState;
        if (!map || !fitRasterId) return;

        const raster = rasters.find((r) => r.id === fitRasterId);
        if (!raster?.aoi) return;

        const sourceProj = raster.projection || "EPSG:32643";
        ensureProjection(sourceProj);

        const centerUTM = [
            (raster.aoi[0] + raster.aoi[2]) / 2,
            (raster.aoi[1] + raster.aoi[3]) / 2
        ];
        const centerLonLat = transform(centerUTM, sourceProj, map.getView().getProjection());

        map.getView().setCenter(centerLonLat);
        map.getView().setZoom(22);

        setFitRasterId(null);

    }, [fitRasterId]);
};
