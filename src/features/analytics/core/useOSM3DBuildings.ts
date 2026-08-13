import { useEffect, useRef } from "react";
import { MercatorCoordinate } from "maplibre-gl";
import type {
    CustomLayerInterface,
    Map as MapLibreMap,
    MapSourceDataEvent,
} from "maplibre-gl";

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMapStore } from "../store/useMapStore";
import { ANCHOR_RESET_METERS, CACHE_GRACE_PASSES, FALLBACK_SOURCE_ID, FALLBACK_TILE_URL, KEEPER_LAYER_ID, LAYER_ID, REBUILD_INTERVAL_MS } from "../constant/3Dconstant";
import { parseHexColorAndOpacity, createBuildingGeometry, getProjectionMatrix, hasVectorLayer, isExtrudable, boundsOf, intersects, padBounds, featureKey, type Box, type Anchor, toBox, contains } from "../utils/Use3dassetes.ts";

export type BuildingLayerHandle = {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
};

export type OSM3DBuildingsOptions = {
    sourceId?: string;
    sourceLayer?: string;
    minZoom?: number;
    color?: string;
    /** Upper bound on cached building geometries, not on what is drawn. */
    maxBuildings?: number;
    hideBasemapBuildings?: boolean;
    /**
     * How much beyond the viewport to build, as a fraction of its size.
     * Larger means fewer rebuilds while panning, more triangles per frame.
     */
    viewPadding?: number;
};

const DEFAULTS = {
    sourceLayer: "building",
    minZoom: 15,
    color: "#4f13ddff",
    maxBuildings: 6000,
    hideBasemapBuildings: true,
    viewPadding: 0.5,
};

export function useOSM3DBuildings(
    map: MapLibreMap | null,
    options: OSM3DBuildingsOptions = {},
) {
    const layerRef = useRef<BuildingLayerHandle | null>(null);
    const {
        sourceId: preferredSourceId,
        sourceLayer = DEFAULTS.sourceLayer,
        minZoom = DEFAULTS.minZoom,
        color = DEFAULTS.color,
        maxBuildings = DEFAULTS.maxBuildings,
        hideBasemapBuildings = DEFAULTS.hideBasemapBuildings,
        viewPadding = DEFAULTS.viewPadding,
    } = options;

    const mapType = useMapStore((state) => state.Maptype);

    useEffect(() => {
        if (!map || !map.isStyleLoaded()) return;

        const layers = map.getStyle()?.layers ?? [];

        for (const layer of layers) {
            if (
                (layer as any)["source-layer"] !== "building" ||
                (layer.type !== "fill" && layer.type !== "fill-extrusion")
            ) {
                continue;
            }

            map.setLayoutProperty(
                layer.id,
                "visibility",
                "none"
            );
        }
    }, [map, mapType]);

    useEffect(() => {
        if (!map) return;
        if (mapType === "2d") return;

        let disposed = false;
        let frame: number | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let pending = false;
        let force = true;
        let lastRebuild = 0;
        let sourceId: string | null = null;
        let createdSource = false;
        const hiddenLayers: string[] = [];

        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        const buildings = new THREE.Group();
        scene.add(buildings);

        const {
            color: parsedColor,
            opacity,
            transparent,
        } = parseHexColorAndOpacity(color);

        const material = new THREE.MeshStandardMaterial({
            color: parsedColor,
            opacity,
            transparent,
            roughness: 0.8,
            metalness: 0,
            side: THREE.DoubleSide,
        });

        scene.add(new THREE.AmbientLight(0xffffff, 1.8));

        const sun = new THREE.DirectionalLight(0xffffff, 2.5);
        sun.position.set(-100, -100, 200);
        scene.add(sun);

        let renderer: THREE.WebGLRenderer | null = null;

        /* ---- batch state ------------------------------------------- */

        type CacheEntry = {
            geometry: THREE.BufferGeometry;
            bbox: Box;
            usedAt: number;
        };

        /*
         * Per-building geometry is cached in the anchor frame, so panning
         * back over ground already visited costs a merge, not a retriangu-
         * lation. The drawn scene is a single merged mesh: one draw call
         * for the whole city instead of one per building.
         */
        const cache = new Map<string, CacheEntry>();

        let anchor: Anchor | null = null;
        let batch: THREE.Mesh | null = null;
        let builtBounds: Box | null = null;
        let pass = 0;

        const disposeBatch = () => {
            if (!batch) return;
            buildings.remove(batch);
            batch.geometry.dispose();
            batch = null;
        };

        const clearCache = () => {
            for (const entry of cache.values()) entry.geometry.dispose();
            cache.clear();
        };

        const resetScene = () => {
            disposeBatch();
            clearCache();
            builtBounds = null;
            anchor = null;
        };

        const ensureAnchor = () => {
            const center = map.getCenter();

            if (anchor) {
                const mercator = MercatorCoordinate.fromLngLat([
                    center.lng,
                    center.lat,
                ]);

                const dx =
                    (mercator.x - anchor.mercator.x) / anchor.scale;
                const dy =
                    (mercator.y - anchor.mercator.y) / anchor.scale;

                if (Math.hypot(dx, dy) < ANCHOR_RESET_METERS) return anchor;

                /* Too far out to keep float32 precision - start over. */
                resetScene();
            }

            const mercator = MercatorCoordinate.fromLngLat([
                center.lng,
                center.lat,
            ]);

            anchor = {
                mercator,
                scale: mercator.meterInMercatorCoordinateUnits(),
                lng: center.lng,
                lat: center.lat,
            };

            return anchor;
        };

        const prune = () => {
            if (cache.size <= maxBuildings) return;

            const stale = [...cache.entries()]
                .filter(([, entry]) => entry.usedAt < pass - CACHE_GRACE_PASSES)
                .sort((a, b) => a[1].usedAt - b[1].usedAt);

            for (const [key, entry] of stale) {
                if (cache.size <= maxBuildings) break;
                entry.geometry.dispose();
                cache.delete(key);
            }
        };

        /* ---- source wiring ----------------------------------------- */

        const ensureSource = () => {
            if (sourceId && map.getSource(sourceId)) return sourceId;

            sourceId = null;
            createdSource = false;

            if (preferredSourceId && map.getSource(preferredSourceId)) {
                sourceId = preferredSourceId;
                return sourceId;
            }

            const styleSources = map.getStyle()?.sources ?? {};

            for (const id of Object.keys(styleSources)) {
                if (hasVectorLayer(map, id, sourceLayer)) {
                    sourceId = id;
                    return sourceId;
                }
            }

            if (!map.getSource(FALLBACK_SOURCE_ID)) {
                map.addSource(FALLBACK_SOURCE_ID, {
                    type: "vector",
                    url: FALLBACK_TILE_URL,
                });
            }

            if (!map.getLayer(KEEPER_LAYER_ID)) {
                map.addLayer({
                    id: KEEPER_LAYER_ID,
                    type: "fill",
                    source: FALLBACK_SOURCE_ID,
                    "source-layer": sourceLayer,
                    minzoom: minZoom,
                    paint: { "fill-opacity": 0 },
                });
            }

            createdSource = true;
            sourceId = FALLBACK_SOURCE_ID;
            return sourceId;
        };

        const hideFlatBuildings = () => {
            if (!hideBasemapBuildings) return;

            for (const layer of map.getStyle()?.layers ?? []) {
                if (layer.id === KEEPER_LAYER_ID) continue;

                if (
                    (layer as any)["source-layer"] !== sourceLayer ||
                    (layer.type !== "fill" && layer.type !== "fill-extrusion")
                ) {
                    continue;
                }

                map.setLayoutProperty(layer.id, "visibility", "none");
                hiddenLayers.push(layer.id);
            }
        };

        /* ---- the rebuild ------------------------------------------- */

        const rebuild = () => {
            if (disposed) return;

            const activeSource = sourceId;
            if (!activeSource || !map.getSource(activeSource)) return;

            if (map.getZoom() < minZoom) {
                const wasVisible = buildings.visible;
                buildings.visible = false;
                if (wasVisible) map.triggerRepaint();
                return;
            }

            const view = toBox(map.getBounds());

            /*
             * The batch covers a padded viewport, so panning and zooming
             * inside it need no work at all - this is what keeps gestures
             * smooth. Only leaving that box, or new tile data, rebuilds.
             */
            if (!force && builtBounds && contains(builtBounds, view)) {
                if (!buildings.visible) {
                    buildings.visible = true;
                    map.triggerRepaint();
                }
                return;
            }

            force = false;
            pass += 1;

            const target = padBounds(map.getBounds(), viewPadding);
            const currentAnchor = ensureAnchor();

            const features = map.querySourceFeatures(activeSource, {
                sourceLayer,
            });

            for (const feature of features) {
                if (!isExtrudable(feature)) continue;
                if (feature.properties?.hide_3d) continue;

                const bbox = boundsOf(feature.geometry);

                if (!Number.isFinite(bbox.west)) continue;
                if (!intersects(bbox, target)) continue;

                const key = featureKey(feature, bbox);

                let entry = cache.get(key);

                if (!entry) {
                    const geometry = createBuildingGeometry(
                        feature,
                        currentAnchor,
                    );

                    if (!geometry) continue;

                    entry = {
                        geometry,
                        bbox,
                        usedAt: pass,
                    };

                    cache.set(key, entry);
                } else {
                    entry.usedAt = pass;
                }
            }

            /*
             * IMPORTANT:
             * Build from the cache, not only from the features returned
             * by this particular source-tile query.
             */
            const visible: THREE.BufferGeometry[] = [];

            for (const entry of cache.values()) {
                if (!intersects(entry.bbox, target)) continue;

                entry.usedAt = pass;
                visible.push(entry.geometry);
            }
            if (visible.length === 0) {
                /*
                 * MapLibre may temporarily return no source features while
                 * tiles are loading/reloading.
                 *
                 * Never destroy an already visible building batch.
                 */
                buildings.visible = true;
                return;
            }

            const merged =
                visible.length > 0
                    ? mergeGeometries(visible, false)
                    : null;

            merged.computeBoundingBox();
            merged.computeBoundingSphere();
            if (!merged) {
                buildings.visible = true;
                return;
            }
            if (merged) {
                const newMesh = new THREE.Mesh(merged, material);

                newMesh.frustumCulled = false;

                newMesh.position.set(
                    currentAnchor.mercator.x,
                    currentAnchor.mercator.y,
                    currentAnchor.mercator.z,
                );

                newMesh.scale.set(
                    currentAnchor.scale,
                    currentAnchor.scale,
                    currentAnchor.scale,
                );


                buildings.add(newMesh);


                const oldBatch = batch;
                batch = newMesh;

                if (oldBatch) {
                    buildings.remove(oldBatch);
                    oldBatch.geometry.dispose();
                }
            }

            buildings.visible = true;
            builtBounds = target;

            prune();

            map.triggerRepaint();
        };

        /* Leading-edge throttle that always runs a trailing pass. */
        const scheduleRebuild = (forceRebuild = false) => {
            if (disposed) return;

            pending = true;
            if (forceRebuild) force = true;

            if (timer !== null || frame !== null) return;

            const wait = Math.max(
                0,
                REBUILD_INTERVAL_MS - (performance.now() - lastRebuild),
            );

            timer = setTimeout(() => {
                timer = null;
                if (disposed || !pending) return;

                pending = false;
                lastRebuild = performance.now();

                frame = requestAnimationFrame(() => {
                    frame = null;
                    rebuild();
                    if (pending) scheduleRebuild();
                });
            }, wait);
        };

        /* ---- layer -------------------------------------------------- */

        const layer: CustomLayerInterface = {
            id: LAYER_ID,
            type: "custom",
            renderingMode: "3d",

            onAdd(mapInstance, gl) {
                renderer = new THREE.WebGLRenderer({
                    canvas: mapInstance.getCanvas(),
                    context: gl,
                });
                renderer.autoClear = false;
                layerRef.current = { scene, camera, renderer };
            },

            render(_gl, args) {
                if (!renderer) return;
                const matrix = getProjectionMatrix(args);
                if (!matrix) return;

                camera.projectionMatrix.fromArray(matrix as number[]);
                camera.projectionMatrixInverse
                    .copy(camera.projectionMatrix)
                    .invert();

                renderer.resetState();
                renderer.render(scene, camera);
            },

            /*
             * Also called by setStyle(), so this must leave the hook
             * re-addable: the material belongs to the effect.
             */
            onRemove() {
                resetScene();
                renderer?.dispose();
                renderer = null;
                layerRef.current = null;
            },
        };

        const addLayer = () => {
            if (disposed) return;
            if (mapType !== "3d") return;

            ensureSource();
            hideFlatBuildings();

            if (!map.getLayer(LAYER_ID)) {
                map.addLayer(layer);
            }

            scheduleRebuild(true);
        };

        const handleStyleLoad = () => {
            if (disposed) return;

            sourceId = null;
            createdSource = false;
            hiddenLayers.length = 0;

            resetScene();

            if (mapType !== "3d") return;
            addLayer();
        };

        const handleSourceData = (event: MapSourceDataEvent) => {
            if (event.sourceId !== sourceId) return;
            if (event.isSourceLoaded || event.tile) {
                /* New geometry may exist inside the built box. */
                scheduleRebuild();
            }
        };

        const handleMoveEnd = () => scheduleRebuild();
        const handleIdle = () => scheduleRebuild();

        if (map.isStyleLoaded()) {
            addLayer();
        } else {
            map.once("load", addLayer);
        }

        map.on("style.load", handleStyleLoad);
        map.on("sourcedata", handleSourceData);
        map.on("move", handleMoveEnd);
        map.on("moveend", handleMoveEnd);
        map.on("idle", handleIdle);

        return () => {
            disposed = true;

            if (frame !== null) cancelAnimationFrame(frame);
            if (timer !== null) clearTimeout(timer);

            map.off("style.load", handleStyleLoad);
            map.off("sourcedata", handleSourceData);
            map.off("move", handleMoveEnd);
            map.off("moveend", handleMoveEnd);
            map.off("idle", handleIdle);
            map.off("load", addLayer);

            try {


                if (map.getLayer(LAYER_ID)) {
                    map.removeLayer(LAYER_ID);
                } else {
                    resetScene();
                    renderer?.dispose();
                    renderer = null;
                }

                if (createdSource) {
                    if (map.getLayer(KEEPER_LAYER_ID)) {
                        map.removeLayer(KEEPER_LAYER_ID);
                    }
                    if (map.getSource(FALLBACK_SOURCE_ID)) {
                        map.removeSource(FALLBACK_SOURCE_ID);
                    }
                }
            } catch {
                /* Map already destroyed */
            }

            resetScene();
            material.dispose();
            layerRef.current = null;
        };
    }, [
        map,
        mapType,
        hideBasemapBuildings,
        maxBuildings,
        minZoom,
        preferredSourceId,
        sourceLayer,
        color,
        viewPadding,
    ]);

    return layerRef;
}

