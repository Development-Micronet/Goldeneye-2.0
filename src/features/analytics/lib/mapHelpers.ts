/**
 * Everything that translates our declarative `LayerDef[]` state into imperative
 * MapLibre calls.
 *
 * The `syncLayers` function at the bottom is a small reconciler: React owns the
 * layer list, this file diffs it against what the map currently holds. That is
 * what makes basemap switching safe — after `setStyle` wipes the map we simply
 * replay the same state.
 */
import type {
    LayerSpecification,
    Map as MapLibreMap,
    GeoJSONSource,
    ImageSource,
    SourceSpecification,
    StyleSpecification,
    SkySpecification,
} from "maplibre-gl";
import type { BasemapDef, LayerDef, ProjectionMode } from "../types/types";

/** Namespace for user layers so we never touch basemap or tool layers. */
export const USER_PREFIX = "usr:";
export const BASEMAP_SOURCE_ID = "basemap";
export const BASEMAP_LAYER_ID = "basemap-tiles";

export const sourceIdFor = (def: LayerDef) => `${USER_PREFIX}${def.id}`;
export const isUserId = (id: string) => id.startsWith(USER_PREFIX);

/* ------------------------------------------------------------------ */
/* Style + atmosphere                                                  */
/* ------------------------------------------------------------------ */

/** Sky, horizon and fog tuned to the basemap tone so the globe reads well. */
export function skyForBasemap(basemap: BasemapDef): SkySpecification {
    const palettes: Record<BasemapDef["tone"], [string, string, string]> = {
        // [sky, horizon, fog]
        dark: ["#05070d", "#1b2735", "#0b1220"],
        imagery: ["#04070f", "#2a4a72", "#0a1a2f"],
        light: ["#7fb2e5", "#dfe9f3", "#c9d8e8"],
        terrain: ["#6ea8dd", "#e4ecf2", "#cfe0ea"],
        // Daylight sky for the 3D city basemap.
        "3d": ["#1990ff", "#ffffff", "#eef4fa"],
    };
    // Fall back rather than destructure undefined: an unknown tone used to throw
    // here, which killed style construction and left styleEpoch at 0 — with the
    // epoch at 0 every feature hook (layers, draw, geolocation) silently no-ops.
    const [sky, horizon, fog] = palettes[basemap.tone] ?? palettes.light;
    return {
        "sky-color": sky,
        "sky-horizon-blend": 0.6,
        "horizon-color": horizon,
        "horizon-fog-blend": 0.55,
        "fog-color": fog,
        "fog-ground-blend": 0.75,
        // Atmosphere is strongest on the globe and fades out as we zoom in.
        "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1,
            6, 0.6,
            10, 0,
        ],
    } as SkySpecification;
}

/** Minimal style holding only the basemap; user layers are added on top. */
export function buildBaseStyle(
    basemap: BasemapDef,
    projection: ProjectionMode,
): StyleSpecification | string {
    // Vector basemaps ship their own complete style document. Returning the URL
    // lets MapLibre fetch it; trying to wrap one in a raster source produced a
    // source with `tiles: undefined`, which failed style validation and meant
    // `style.load` never fired.
    if (basemap.type === "vector" && basemap.styleUrl) return basemap.styleUrl;

    return {
        version: 8,
        projection: { type: projection },
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sky: skyForBasemap(basemap),
        sources: {
            [BASEMAP_SOURCE_ID]: {
                type: "raster",
                tiles: basemap.tiles,
                tileSize: basemap.tileSize,
                maxzoom: basemap.maxzoom,
                attribution: basemap.attribution,
            },
        },
        layers: [
            {
                id: BASEMAP_LAYER_ID,
                type: "raster",
                source: BASEMAP_SOURCE_ID,
                paint: { "raster-opacity": 1 },
            },
        ],
    } as StyleSpecification;
}

/**
 * Swaps the basemap in place.
 *
 * We rebuild only the `basemap` source/layer instead of calling `setStyle`,
 * so user layers, draw geometry and terrain survive the switch untouched —
 * that is what makes the gallery feel instant.
 */
export function applyBasemap(
    map: MapLibreMap,
    basemap: BasemapDef,
    projection: ProjectionMode = "globe",
): void {
    /* ---------------------------------------------------------- vector path */
    // A vector basemap replaces the whole style document. This wipes every user
    // source, the draw layers and terrain — they are all restored by the hooks
    // that watch `styleEpoch`, which the resulting `style.load` bumps.
    if (basemap.type === "vector" && basemap.styleUrl) {
        if (map.getStyle()?.name !== basemap.name) {
            map.setStyle(basemap.styleUrl, { diff: false });
        }
        return;
    }

    /* ---------------------------------------------------------- raster path */
    // Coming back from a vector style: nothing of ours survives, so rebuild the
    // minimal raster style rather than trying to graft a source onto it.
    if (!map.getSource(BASEMAP_SOURCE_ID) && !map.getLayer(BASEMAP_LAYER_ID)) {
        const style = buildBaseStyle(basemap, projection);
        if (typeof style !== "string") {
            map.setStyle(style, { diff: false });
            return;
        }
    }

    // Fast path: same style document, just swap the tiles underneath.
    if (map.getLayer(BASEMAP_LAYER_ID)) map.removeLayer(BASEMAP_LAYER_ID);
    if (map.getSource(BASEMAP_SOURCE_ID)) map.removeSource(BASEMAP_SOURCE_ID);

    map.addSource(BASEMAP_SOURCE_ID, {
        type: "raster",
        tiles: basemap.tiles ?? [],
        tileSize: basemap.tileSize ?? 256,
        maxzoom: basemap.maxzoom ?? 19,
        attribution: basemap.attribution,
    });

    // Always the bottom-most layer.
    const firstLayerId = map.getStyle()?.layers?.[0]?.id;
    map.addLayer(
        {
            id: BASEMAP_LAYER_ID,
            type: "raster",
            source: BASEMAP_SOURCE_ID,
            paint: { "raster-opacity": 1, "raster-fade-duration": 150 },
        },
        firstLayerId,
    );

    map.setSky(skyForBasemap(basemap));
}

/* ------------------------------------------------------------------ */
/* Source construction                                                 */
/* ------------------------------------------------------------------ */

/** WMS GetMap request wrapped in a tiled raster source (EPSG:3857). */
export function buildWmsTileUrl(def: Extract<LayerDef, { kind: "wms" }>): string {
    const params: Record<string, string> = {
        service: "WMS",
        request: "GetMap",
        version: def.version,
        layers: def.layers,
        styles: def.styles ?? "",
        format: def.format,
        transparent: String(def.transparent),
        width: String(def.tileSize),
        height: String(def.tileSize),
    };
    // 1.3.0 renamed SRS to CRS; axis order is handled by MapLibre's bbox token.
    if (def.version === "1.3.0") params.crs = "EPSG:3857";
    else params.srs = "EPSG:3857";

    const query = Object.entries(params)
        .map(([k, v]) => `${k.toUpperCase()}=${encodeURIComponent(v)}`)
        .join("&");
    const sep = def.url.includes("?") ? "&" : "?";
    return `${def.url}${sep}${query}&BBOX={bbox-epsg-3857}`;
}

/** WMTS KVP GetTile template (RESTful templates are used verbatim). */
export function buildWmtsTileUrl(def: Extract<LayerDef, { kind: "wmts" }>): string {
    if (def.template) return def.template;
    const params: Record<string, string> = {
        service: "WMTS",
        request: "GetTile",
        version: "1.0.0",
        layer: def.layer ?? "",
        style: def.style ?? "default",
        format: def.format ?? "image/png",
        tilematrixset: def.tileMatrixSet ?? "GoogleMapsCompatible",
    };
    const query = Object.entries(params)
        .map(([k, v]) => `${k.toUpperCase()}=${encodeURIComponent(v)}`)
        .join("&");
    const sep = (def.url ?? "").includes("?") ? "&" : "?";
    return `${def.url ?? ""}${sep}${query}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
}

export function buildSource(def: LayerDef): SourceSpecification {
    const attribution = def.metadata?.attribution;
    switch (def.kind) {
        case "raster":
            return {
                type: "raster",
                tiles: def.tiles,
                tileSize: def.tileSize,
                scheme: def.scheme ?? "xyz",
                minzoom: def.minzoom,
                maxzoom: def.maxzoom,
                bounds: def.bounds,
                attribution,
            } as SourceSpecification;
        case "wms":
            return {
                type: "raster",
                tiles: [buildWmsTileUrl(def)],
                tileSize: def.tileSize,
                minzoom: def.minzoom,
                maxzoom: def.maxzoom,
                attribution,
            } as SourceSpecification;
        case "wmts":
            return {
                type: "raster",
                tiles: [buildWmtsTileUrl(def)],
                tileSize: def.tileSize,
                minzoom: def.minzoom,
                maxzoom: def.maxzoom,
                attribution,
            } as SourceSpecification;
        case "vector":
            return def.url
                ? ({ type: "vector", url: def.url, attribution } as SourceSpecification)
                : ({
                    type: "vector",
                    tiles: def.tiles ?? [],
                    minzoom: def.minzoom ?? 0,
                    maxzoom: def.maxzoom ?? 14,
                    attribution,
                } as SourceSpecification);
        case "geojson":
            return {
                type: "geojson",
                data: def.data,
                cluster: def.cluster,
                clusterRadius: 50,
                clusterMaxZoom: 14,
                attribution,
            } as SourceSpecification;
        case "image":
            return {
                type: "image",
                url: def.url,
                coordinates: def.coordinates,
            } as SourceSpecification;
    }
}

/* ------------------------------------------------------------------ */
/* Layer construction                                                  */
/* ------------------------------------------------------------------ */

/** Paint property that carries opacity for each MapLibre layer type. */
const OPACITY_PROP: Record<string, string> = {
    raster: "raster-opacity",
    fill: "fill-opacity",
    line: "line-opacity",
    circle: "circle-opacity",
    symbol: "text-opacity",
    "fill-extrusion": "fill-extrusion-opacity",
    heatmap: "heatmap-opacity",
};

/**
 * Expands a layer definition into the concrete MapLibre layers it needs.
 * A GeoJSON layer becomes up to five layers (fill, outline, line, points,
 * labels + clustering) so one toggle controls the whole visual unit.
 */
export function buildLayers(def: LayerDef): LayerSpecification[] {
    const src = sourceIdFor(def);
    const id = (suffix: string) => `${src}:${suffix}`;
    const range = { minzoom: def.minzoom, maxzoom: def.maxzoom };
    const clean = <T extends object>(o: T): T =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

    switch (def.kind) {
        case "raster":
        case "wms":
        case "wmts":
            return [
                clean({
                    id: id("raster"),
                    type: "raster",
                    source: src,
                    ...range,
                    paint: { "raster-opacity": def.opacity, "raster-fade-duration": 200 },
                }) as LayerSpecification,
            ];

        case "image":
            return [
                clean({
                    id: id("raster"),
                    type: "raster",
                    source: src,
                    paint: { "raster-opacity": def.opacity },
                }) as LayerSpecification,
            ];

        case "vector":
            return def.styleLayers.map(
                (sub) =>
                    clean({
                        id: id(sub.id),
                        type: sub.type,
                        source: src,
                        "source-layer": sub.sourceLayer,
                        ...range,
                        filter: sub.filter,
                        layout: sub.layout,
                        paint: withOpacity(sub.type, sub.paint ?? {}, def.opacity),
                    }) as unknown as LayerSpecification,
            );

        case "geojson": {
            const s = def.style;
            const layers: LayerSpecification[] = [
                // Polygons ------------------------------------------------------
                {
                    id: id("fill"),
                    type: "fill",
                    source: src,
                    filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                    paint: {
                        "fill-color": s.fillColor,
                        "fill-opacity": s.fillOpacity * def.opacity,
                    },
                },
                {
                    id: id("fill-outline"),
                    type: "line",
                    source: src,
                    filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                    paint: {
                        "line-color": s.lineColor,
                        "line-width": s.lineWidth,
                        "line-opacity": def.opacity,
                    },
                },
                // Lines ---------------------------------------------------------
                {
                    id: id("line"),
                    type: "line",
                    source: src,
                    filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
                    layout: { "line-cap": "round", "line-join": "round" },
                    paint: {
                        "line-color": s.lineColor,
                        "line-width": s.lineWidth,
                        "line-opacity": def.opacity,
                    },
                },
            ] as LayerSpecification[];

            if (def.cluster) {
                layers.push(
                    {
                        id: id("clusters"),
                        type: "circle",
                        source: src,
                        filter: ["has", "point_count"],
                        paint: {
                            "circle-color": s.pointColor,
                            "circle-opacity": 0.85 * def.opacity,
                            "circle-radius": ["step", ["get", "point_count"], 14, 25, 20, 100, 28],
                            "circle-stroke-width": 2,
                            "circle-stroke-color": "rgba(255,255,255,0.65)",
                        },
                    },
                    {
                        id: id("cluster-count"),
                        type: "symbol",
                        source: src,
                        filter: ["has", "point_count"],
                        layout: {
                            "text-field": ["get", "point_count_abbreviated"],
                            "text-font": ["Noto Sans Regular"],
                            "text-size": 12,
                        },
                        paint: { "text-color": "#08131c", "text-opacity": def.opacity },
                    },
                );
            }

            // Points ----------------------------------------------------------
            layers.push({
                id: id("point"),
                type: "circle",
                source: src,
                filter: def.cluster
                    ? ["!", ["has", "point_count"]]
                    : ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                paint: {
                    "circle-color": s.pointColor,
                    "circle-radius": s.pointRadius,
                    "circle-opacity": def.opacity,
                    "circle-stroke-width": 1.5,
                    "circle-stroke-color": "rgba(8,19,28,0.85)",
                },
            } as LayerSpecification);

            if (s.labelField) {
                layers.push({
                    id: id("label"),
                    type: "symbol",
                    source: src,
                    filter: def.cluster ? ["!", ["has", "point_count"]] : ["literal", true],
                    layout: {
                        "text-field": ["coalesce", ["get", s.labelField], ""],
                        "text-font": ["Noto Sans Regular"],
                        "text-size": 11,
                        "text-offset": [0, 1.1],
                        "text-anchor": "top",
                        "text-allow-overlap": false,
                    },
                    paint: {
                        "text-color": "#e8f1f8",
                        "text-halo-color": "rgba(6,12,18,0.9)",
                        "text-halo-width": 1.2,
                        "text-opacity": def.opacity,
                    },
                } as LayerSpecification);
            }

            return layers.map((l) => clean({ ...l, ...range }) as LayerSpecification);
        }
    }
}

/** Multiplies a sub-layer's own opacity by the layer-level opacity. */
function withOpacity(
    type: string,
    paint: Record<string, unknown>,
    opacity: number,
): Record<string, unknown> {
    const prop = OPACITY_PROP[type];
    if (!prop) return paint;
    const base = typeof paint[prop] === "number" ? (paint[prop] as number) : 1;
    return { ...paint, [prop]: base * opacity };
}

/* ------------------------------------------------------------------ */
/* Reconciler                                                          */
/* ------------------------------------------------------------------ */

export interface SyncState {
    /** defId -> rev that is currently materialised on the map. */
    applied: Map<string, number>;
}

/** Removes every MapLibre layer/source belonging to a user layer definition. */
function removeDefFromMap(map: MapLibreMap, sourceId: string): void {
    const style = map.getStyle();
    (style?.layers ?? []).forEach((layer) => {
        if ("source" in layer && layer.source === sourceId && map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
        }
    });
    if (map.getSource(sourceId)) map.removeSource(sourceId);
}

/** Cheap updates that never require rebuilding the layer. */
function applyVisualState(map: MapLibreMap, def: LayerDef): void {
    buildLayers(def).forEach((spec) => {
        if (!map.getLayer(spec.id)) return;
        map.setLayoutProperty(spec.id, "visibility", def.visible ? "visible" : "none");
        const paint = (spec as { paint?: Record<string, unknown> }).paint ?? {};
        Object.entries(paint).forEach(([prop, value]) => {
            if (prop.endsWith("opacity")) map.setPaintProperty(spec.id, prop, value);
        });
    });
}

/**
 * Diffs `defs` (top-first, as shown in the layer panel) against the map.
 * Call it whenever layers change *and* after every style reload.
 */
export function syncLayers(map: MapLibreMap, defs: LayerDef[], state: SyncState): void {
    // NOTE: do NOT gate on `map.isStyleLoaded()`. That returns false whenever any
    // source still has tiles in flight, which is the normal state of a busy map —
    // it silently dropped every layer added while tiles were loading. Adding
    // sources and layers only requires the *style* to be parsed, which is exactly
    // what `styleEpoch` already guarantees at the call site.
    if (!map.getStyle()) return;

    const wantedSources = new Set(defs.map(sourceIdFor));

    // 1. Drop layers that are no longer in state (or whose style was wiped).
    const style = map.getStyle();
    Object.keys(style?.sources ?? {}).forEach((sourceId) => {
        if (isUserId(sourceId) && !wantedSources.has(sourceId)) {
            removeDefFromMap(map, sourceId);
            state.applied.delete(sourceId.slice(USER_PREFIX.length));
        }
    });

    // 2. Add or rebuild.
    defs.forEach((def) => {
        const sourceId = sourceIdFor(def);
        const appliedRev = state.applied.get(def.id);
        const exists = Boolean(map.getSource(sourceId));

        if (exists && appliedRev === def.rev) {
            applyVisualState(map, def);
            return;
        }
        if (exists) removeDefFromMap(map, sourceId);

        try {
            map.addSource(sourceId, buildSource(def));
            buildLayers(def).forEach((spec) => {
                map.addLayer({
                    ...spec,
                    layout: {
                        ...(spec as { layout?: object }).layout,
                        visibility: def.visible ? "visible" : "none",
                    },
                } as LayerSpecification);
            });
            state.applied.set(def.id, def.rev);
        } catch (error) {
            // A bad WMS url or malformed MVT should not take the whole map down.
            console.error(`[EarthMap] could not add layer "${def.name}"`, error);
        }
    });

    // 3. Enforce order. defs[0] is the top of the panel, so walk bottom-up and
    //    push each group to the top of the stack.
    for (let i = defs.length - 1; i >= 0; i--) {
        buildLayers(defs[i]).forEach((spec) => {
            if (map.getLayer(spec.id)) map.moveLayer(spec.id);
        });
    }
}

/** Pushes tool layers (draw, measure, geolocation) above everything else. */
export function raiseToTop(map: MapLibreMap, layerIds: string[]): void {
    layerIds.forEach((id) => {
        if (map.getLayer(id)) map.moveLayer(id);
    });
}

/** GeoJSON data updates bypass the rebuild path for smooth live editing. */
export function updateGeoJSONData(
    map: MapLibreMap,
    def: Extract<LayerDef, { kind: "geojson" }>,
): void {
    const source = map.getSource(sourceIdFor(def)) as GeoJSONSource | undefined;
    source?.setData(def.data);
}

export function updateImageCoordinates(
    map: MapLibreMap,
    def: Extract<LayerDef, { kind: "image" }>,
): void {
    const source = map.getSource(sourceIdFor(def)) as ImageSource | undefined;
    source?.setCoordinates(def.coordinates);
}

/** Unique-ish id generator (crypto.randomUUID isn't available everywhere). */
export function uid(prefix = "l"): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}