/**
 * Draw + measure engine.
 *
 * Deliberately dependency-free: mapbox-gl-draw is not an option here, so this
 * implements the pieces we actually need on top of three GeoJSON sources —
 * committed features, the in-progress draft, and edit handles.
 *
 * Modes: point, line, polygon, rectangle, circle, select (edit/move/delete)
 *        and the three measure variants (distance, area, bearing).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
    GeoJSONSource,
    Map as MapLibreMap,
    MapMouseEvent,
    MapTouchEvent,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Point, Position } from "geojson";
import type { DrawFeatureProps, DrawMode } from "../types/types";
import {
    bearing,
    circlePolygon,
    formatArea,
    formatBearing,
    formatDistance,
    geojsonBounds,
    haversine,
    lineLength,
    lineMidpoint,
    polygonArea,
    rectangleRing,
    ringCentroid,
} from "../lib/geo";

export type DrawFeature = Feature & { properties: DrawFeatureProps & { fid: string } };

/* Source + layer ids (kept out of the user namespace). */
const SRC_FEATURES = "draw-features";
const SRC_DRAFT = "draw-draft";
const SRC_HANDLES = "draw-handles";
const SRC_LABELS = "draw-labels";

export const DRAW_LAYER_IDS = [
    "draw-fill",
    "draw-outline",
    "draw-line",
    "draw-point",
    "draw-draft-fill",
    "draw-draft-line",
    "draw-draft-vertex",
    "draw-label",
    "draw-handle",
];

const ACCENT = "#f5b301"; // draw
const MEASURE = "#2dd4bf"; // measure
const SELECTED = "#ff5c8a";

const emptyFC = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/** Human-readable measurement for a feature, plus where to anchor it. */
function labelFor(feature: DrawFeature): { text: string; at: Position } | null {
    const geom = feature.geometry;
    const props = feature.properties;

    if (geom.type === "LineString") {
        if (props.shape === "line" && geom.coordinates.length === 2 && props.measure) {
            const b = bearing(geom.coordinates[0], geom.coordinates[1]);
            const d = haversine(geom.coordinates[0], geom.coordinates[1]);
            return { text: `${formatBearing(b)}\n${formatDistance(d)}`, at: lineMidpoint(geom.coordinates) };
        }
        return {
            text: formatDistance(lineLength(geom.coordinates)),
            at: lineMidpoint(geom.coordinates),
        };
    }

    if (geom.type === "Polygon") {
        const area = polygonArea(geom.coordinates);
        const perimeter = lineLength(geom.coordinates[0]);
        const radius = props.radius ? `\nr ${formatDistance(props.radius)}` : "";
        return {
            text: `${formatArea(area)}\n${formatDistance(perimeter)}${radius}`,
            at: props.center ?? ringCentroid(geom.coordinates[0]),
        };
    }

    return null;
}

function labelCollection(features: DrawFeature[]): FeatureCollection {
    const out: Feature<Point>[] = [];
    features.forEach((feature) => {
        const label = labelFor(feature);
        if (!label) return;
        out.push({
            type: "Feature",
            properties: { label: label.text, measure: feature.properties.measure ? 1 : 0 },
            geometry: { type: "Point", coordinates: label.at },
        });
    });
    return { type: "FeatureCollection", features: out };
}

/** Edit handles for the selected feature. */
function handleCollection(feature: DrawFeature | undefined): FeatureCollection {
    if (!feature) return emptyFC();
    const geom = feature.geometry;
    const positions: { pos: Position; ring: number; index: number }[] = [];

    if (geom.type === "Point") {
        positions.push({ pos: geom.coordinates, ring: -1, index: 0 });
    } else if (geom.type === "LineString") {
        geom.coordinates.forEach((pos, index) => positions.push({ pos, ring: -1, index }));
    } else if (geom.type === "Polygon") {
        if (feature.properties.shape === "circle") {
            // A circle only needs one handle: drag it to change the radius.
            positions.push({ pos: geom.coordinates[0][0], ring: 0, index: 0 });
        } else {
            geom.coordinates.forEach((ring, r) =>
                ring.slice(0, -1).forEach((pos, index) => positions.push({ pos, ring: r, index })),
            );
        }
    }

    return {
        type: "FeatureCollection",
        features: positions.map(({ pos, ring, index }) => ({
            type: "Feature",
            properties: { fid: feature.properties.fid, ring, index },
            geometry: { type: "Point", coordinates: pos },
        })),
    };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface UseDrawResult {
    mode: DrawMode;
    setMode: (mode: DrawMode) => void;
    features: DrawFeature[];
    selectedId: string | null;
    selectFeature: (fid: string | null) => void;
    deleteSelected: () => void;
    deleteFeature: (fid: string) => void;
    clearAll: () => void;
    zoomToFeature: (fid: string) => void;
    /** Everything drawn so far, ready for download or conversion to a layer. */
    toGeoJSON: () => FeatureCollection;
}

export function useDraw(map: MapLibreMap | null, styleEpoch: number): UseDrawResult {
    const [mode, setModeState] = useState<DrawMode>("idle");
    const [features, setFeatures] = useState<DrawFeature[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Refs mirror state for use inside map event handlers registered once.
    const modeRef = useRef(mode);
    const featuresRef = useRef(features);
    const selectedRef = useRef(selectedId);
    const draftRef = useRef<Position[]>([]);
    const anchorRef = useRef<Position | null>(null);
    const dragRef = useRef<
        | { type: "vertex"; fid: string; ring: number; index: number }
        | { type: "feature"; fid: string; last: Position }
        | { type: "box"; start: Position }
        | null
    >(null);
    const tooltipRef = useRef<maplibregl.Popup | null>(null);

    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { featuresRef.current = features; }, [features]);
    useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

    const isMeasureMode = (m: DrawMode) => m.startsWith("measure");
    const isDrawing = (m: DrawMode) => m !== "idle" && m !== "select";

    /* ------------------------------------------------- sources and layers */
    useEffect(() => {
        if (!map || !styleEpoch) return;

        const addSource = (id: string) => {
            if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: emptyFC() });
        };
        [SRC_FEATURES, SRC_DRAFT, SRC_HANDLES, SRC_LABELS].forEach(addSource);

        const colour = ["case", ["==", ["get", "measure"], 1], MEASURE, ACCENT];
        const selectedColour = [
            "case",
            ["==", ["get", "selected"], 1],
            SELECTED,
            ["==", ["get", "measure"], 1],
            MEASURE,
            ACCENT,
        ];

        const add = (spec: maplibregl.LayerSpecification) => {
            if (!map.getLayer(spec.id)) map.addLayer(spec);
        };

        add({
            id: "draw-fill",
            type: "fill",
            source: SRC_FEATURES,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: { "fill-color": colour as never, "fill-opacity": 0.18 },
        });
        add({
            id: "draw-outline",
            type: "line",
            source: SRC_FEATURES,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: { "line-color": selectedColour as never, "line-width": 2 },
        });
        add({
            id: "draw-line",
            type: "line",
            source: SRC_FEATURES,
            filter: ["==", ["geometry-type"], "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": selectedColour as never, "line-width": 2.4 },
        });
        add({
            id: "draw-point",
            type: "circle",
            source: SRC_FEATURES,
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
                "circle-radius": 6,
                "circle-color": selectedColour as never,
                "circle-stroke-width": 2,
                "circle-stroke-color": "rgba(6,12,18,0.9)",
            },
        });
        add({
            id: "draw-draft-fill",
            type: "fill",
            source: SRC_DRAFT,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: { "fill-color": ACCENT, "fill-opacity": 0.12 },
        });
        add({
            id: "draw-draft-line",
            type: "line",
            source: SRC_DRAFT,
            filter: ["!=", ["geometry-type"], "Point"],
            paint: { "line-color": ACCENT, "line-width": 2, "line-dasharray": [2, 1.5] },
        });
        add({
            id: "draw-draft-vertex",
            type: "circle",
            source: SRC_DRAFT,
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
                "circle-radius": 4,
                "circle-color": "#0b0f14",
                "circle-stroke-width": 2,
                "circle-stroke-color": ACCENT,
            },
        });
        add({
            id: "draw-label",
            type: "symbol",
            source: SRC_LABELS,
            layout: {
                "text-field": ["get", "label"],
                "text-font": ["Open Sans Regular", "Arial Unicode MS"],
                "text-size": 11,
                "text-allow-overlap": true,
                "text-line-height": 1.2,
            },
            paint: {
                "text-color": "#f2f7fb",
                "text-halo-color": "rgba(5,10,16,0.92)",
                "text-halo-width": 1.6,
            },
        });
        add({
            id: "draw-handle",
            type: "circle",
            source: SRC_HANDLES,
            paint: {
                "circle-radius": 5,
                "circle-color": "#ffffff",
                "circle-stroke-width": 2,
                "circle-stroke-color": SELECTED,
            },
        });
    }, [map, styleEpoch]);

    /* ------------------------------------------------------ push data out */
    const pushSource = useCallback(
        (id: string, data: FeatureCollection) => {
            const source = map?.getSource(id) as GeoJSONSource | undefined;
            source?.setData(data);
        },
        [map],
    );

    useEffect(() => {
        if (!map || !styleEpoch) return;
        const decorated = features.map((f) => ({
            ...f,
            properties: {
                ...f.properties,
                measure: f.properties.measure ? 1 : 0,
                selected: f.properties.fid === selectedId ? 1 : 0,
            },
        })) as unknown as Feature[];
        pushSource(SRC_FEATURES, { type: "FeatureCollection", features: decorated });
        pushSource(SRC_LABELS, labelCollection(features));
        pushSource(SRC_HANDLES, handleCollection(features.find((f) => f.properties.fid === selectedId)));
    }, [map, styleEpoch, features, selectedId, pushSource]);

    /* ------------------------------------------------------------ helpers */
    const clearDraft = useCallback(() => {
        draftRef.current = [];
        anchorRef.current = null;
        pushSource(SRC_DRAFT, emptyFC());
        tooltipRef.current?.remove();
    }, [pushSource]);

    const renderDraft = useCallback(
        (coords: Position[], closed: boolean) => {
            const parts: Feature[] = coords.map((pos) => ({
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: pos },
            }));
            if (coords.length >= 2) {
                parts.push({
                    type: "Feature",
                    properties: {},
                    geometry: closed
                        ? { type: "Polygon", coordinates: [[...coords, coords[0]]] }
                        : { type: "LineString", coordinates: coords },
                });
            }
            pushSource(SRC_DRAFT, { type: "FeatureCollection", features: parts });
        },
        [pushSource],
    );

    /** Live readout that follows the cursor while drafting. */
    const showTooltip = useCallback(
        (lngLat: maplibregl.LngLat, html: string) => {
            if (!map) return;
            if (!tooltipRef.current) {
                tooltipRef.current = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: "em-measure-tip",
                    offset: 14,
                    anchor: "left",
                });
            }
            tooltipRef.current.setLngLat(lngLat).setHTML(html).addTo(map);
        },
        [map],
    );

    const commit = useCallback(
        (geometry: DrawFeature["geometry"], props: DrawFeatureProps) => {
            const fid = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            const feature: DrawFeature = {
                type: "Feature",
                properties: { ...props, fid },
                geometry,
            };
            setFeatures((prev) => [...prev, feature]);
            return fid;
        },
        [],
    );

    /** Finishes the current line/polygon draft, if it has enough vertices. */
    const finishDraft = useCallback(() => {
        const m = modeRef.current;
        const coords = draftRef.current;
        const measure = isMeasureMode(m);

        if ((m === "line" || m === "measure-distance" || m === "measure-bearing") && coords.length >= 2) {
            commit({ type: "LineString", coordinates: coords }, {
                shape: "line",
                measure,
                createdAt: Date.now(),
            });
        } else if ((m === "polygon" || m === "measure-area") && coords.length >= 3) {
            commit({ type: "Polygon", coordinates: [[...coords, coords[0]]] }, {
                shape: "polygon",
                measure,
                createdAt: Date.now(),
            });
        }
        clearDraft();
    }, [clearDraft, commit]);

    /* ------------------------------------------------------ interactions */
    useEffect(() => {
        if (!map || !styleEpoch) return;
        const canvas = map.getCanvas();

        const px = (pos: Position) => map.project(pos as [number, number]);

        const onClick = (event: MapMouseEvent) => {
            const m = modeRef.current;
            const pos: Position = [event.lngLat.lng, event.lngLat.lat];

            if (m === "point") {
                commit({ type: "Point", coordinates: pos }, { shape: "point", createdAt: Date.now() });
                return;
            }

            if (m === "select") {
                const hits = map.queryRenderedFeatures(event.point, {
                    layers: ["draw-fill", "draw-line", "draw-point", "draw-outline"].filter((id) =>
                        map.getLayer(id),
                    ),
                });
                setSelectedId((hits[0]?.properties?.fid as string) ?? null);
                return;
            }

            if (m === "line" || m === "polygon" || m === "measure-distance" || m === "measure-area" || m === "measure-bearing") {
                const coords = draftRef.current;
                // Clicking the first vertex closes the shape.
                if (coords.length >= 2) {
                    const first = px(coords[0]);
                    if (Math.hypot(first.x - event.point.x, first.y - event.point.y) < 12) {
                        finishDraft();
                        return;
                    }
                }
                coords.push(pos);
                // Bearing is a two-point measurement — auto-finish.
                if (m === "measure-bearing" && coords.length === 2) {
                    finishDraft();
                    return;
                }
                renderDraft(coords, m === "polygon" || m === "measure-area");
                return;
            }

            if (m === "circle") {
                if (!anchorRef.current) {
                    anchorRef.current = pos;
                    return;
                }
                const radius = haversine(anchorRef.current, pos);
                commit(
                    { type: "Polygon", coordinates: [circlePolygon(anchorRef.current, radius)] },
                    {
                        shape: "circle",
                        center: anchorRef.current as [number, number],
                        radius,
                        createdAt: Date.now(),
                    },
                );
                clearDraft();
            }
        };

        const onMouseMove = (event: MapMouseEvent | MapTouchEvent) => {
            const m = modeRef.current;
            const pos: Position = [event.lngLat.lng, event.lngLat.lat];

            /* -------- dragging (select mode) -------- */
            const drag = dragRef.current;
            if (drag) {
                if (drag.type === "box") {
                    renderDraft(rectangleRing(drag.start, pos).slice(0, -1), true);
                    showTooltip(
                        event.lngLat,
                        `<b>${formatArea(polygonArea([rectangleRing(drag.start, pos)]))}</b>`,
                    );
                    return;
                }
                // Compute the delta up front: the updater must stay pure so React's
                // dev-mode double invocation cannot apply the move twice.
                const delta: Position | null =
                    drag.type === "feature" ? [pos[0] - drag.last[0], pos[1] - drag.last[1]] : null;
                if (drag.type === "feature") drag.last = pos;

                setFeatures((prev) =>
                    prev.map((feature) => {
                        if (feature.properties.fid !== drag.fid) return feature;
                        return drag.type === "vertex"
                            ? moveVertex(feature, drag.ring, drag.index, pos)
                            : translateFeature(feature, delta as Position);
                    }),
                );
                return;
            }

            /* -------- live preview while drafting -------- */
            if (m === "circle" && anchorRef.current) {
                const radius = haversine(anchorRef.current, pos);
                renderDraft(circlePolygon(anchorRef.current, radius, 64).slice(0, -1), true);
                showTooltip(
                    event.lngLat,
                    `<b>r ${formatDistance(radius)}</b><br>${formatArea(Math.PI * radius * radius)}`,
                );
                return;
            }

            if (draftRef.current.length && isDrawing(m)) {
                const preview = [...draftRef.current, pos];
                const closed = m === "polygon" || m === "measure-area";
                renderDraft(preview, closed);
                if (closed) {
                    showTooltip(
                        event.lngLat,
                        `<b>${formatArea(polygonArea([[...preview, preview[0]]]))}</b><br>${formatDistance(lineLength([...preview, preview[0]]))} perimeter`,
                    );
                } else {
                    const total = lineLength(preview);
                    const seg = haversine(draftRef.current[draftRef.current.length - 1], pos);
                    const brg = bearing(draftRef.current[draftRef.current.length - 1], pos);
                    showTooltip(
                        event.lngLat,
                        `<b>${formatDistance(total)}</b><br>segment ${formatDistance(seg)}<br>${formatBearing(brg)}`,
                    );
                }
            }
        };

        const onMouseDown = (event: MapMouseEvent) => {
            const m = modeRef.current;

            if (m === "rectangle") {
                event.preventDefault();
                map.dragPan.disable();
                dragRef.current = { type: "box", start: [event.lngLat.lng, event.lngLat.lat] };
                return;
            }

            if (m !== "select" || !selectedRef.current) return;

            // Handles win over geometry so vertices stay grabbable.
            const handleHit = map.getLayer("draw-handle")
                ? map.queryRenderedFeatures(event.point, { layers: ["draw-handle"] })[0]
                : undefined;
            if (handleHit) {
                event.preventDefault();
                map.dragPan.disable();
                dragRef.current = {
                    type: "vertex",
                    fid: handleHit.properties.fid as string,
                    ring: Number(handleHit.properties.ring),
                    index: Number(handleHit.properties.index),
                };
                return;
            }

            const bodyHit = map.queryRenderedFeatures(event.point, {
                layers: ["draw-fill", "draw-line", "draw-point"].filter((id) => map.getLayer(id)),
            })[0];
            if (bodyHit && bodyHit.properties?.fid === selectedRef.current) {
                event.preventDefault();
                map.dragPan.disable();
                dragRef.current = {
                    type: "feature",
                    fid: selectedRef.current,
                    last: [event.lngLat.lng, event.lngLat.lat],
                };
            }
        };

        const onMouseUp = (event: MapMouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            if (drag.type === "box") {
                const ring = rectangleRing(drag.start, [event.lngLat.lng, event.lngLat.lat]);
                if (haversine(ring[0], ring[2]) > 1) {
                    commit({ type: "Polygon", coordinates: [ring] }, {
                        shape: "rectangle",
                        createdAt: Date.now(),
                    });
                }
                clearDraft();
            }
            dragRef.current = null;
            map.dragPan.enable();
            tooltipRef.current?.remove();
        };

        const onDblClick = (event: MapMouseEvent) => {
            if (!isDrawing(modeRef.current)) return;
            event.preventDefault();
            // The second click already added a duplicate vertex — drop it.
            if (draftRef.current.length > 1) draftRef.current.pop();
            finishDraft();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                clearDraft();
                setSelectedId(null);
                setModeState("idle");
            } else if (event.key === "Enter") {
                if (draftRef.current.length) finishDraft();
            } else if (event.key === "Delete" || event.key === "Backspace") {
                const target = event.target as HTMLElement | null;
                if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
                if (selectedRef.current) {
                    const fid = selectedRef.current;
                    setFeatures((prev) => prev.filter((f) => f.properties.fid !== fid));
                    setSelectedId(null);
                }
            }
        };

        map.on("click", onClick);
        map.on("mousemove", onMouseMove);
        map.on("mousedown", onMouseDown);
        map.on("mouseup", onMouseUp);
        map.on("dblclick", onDblClick);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            map.off("click", onClick);
            map.off("mousemove", onMouseMove);
            map.off("mousedown", onMouseDown);
            map.off("mouseup", onMouseUp);
            map.off("dblclick", onDblClick);
            window.removeEventListener("keydown", onKeyDown);
            canvas.style.cursor = "";
        };
    }, [map, styleEpoch, commit, finishDraft, renderDraft, showTooltip, clearDraft]);

    /* ------------------------------------------------- cursor + gestures */
    useEffect(() => {
        if (!map) return;
        const canvas = map.getCanvas();
        canvas.style.cursor = isDrawing(mode) ? "crosshair" : mode === "select" ? "pointer" : "";
        // Double-click zoom would fight polygon completion.
        if (isDrawing(mode)) map.doubleClickZoom.disable();
        else map.doubleClickZoom.enable();
    }, [map, mode]);

    /* ------------------------------------------------------------ actions */
    const setMode = useCallback(
        (next: DrawMode) => {
            clearDraft();
            setModeState((prev) => (prev === next ? "idle" : next));
            if (next !== "select") setSelectedId(null);
        },
        [clearDraft],
    );

    const deleteFeature = useCallback((fid: string) => {
        setFeatures((prev) => prev.filter((f) => f.properties.fid !== fid));
        setSelectedId((prev) => (prev === fid ? null : prev));
    }, []);

    const deleteSelected = useCallback(() => {
        if (selectedId) deleteFeature(selectedId);
    }, [selectedId, deleteFeature]);

    const clearAll = useCallback(() => {
        setFeatures([]);
        setSelectedId(null);
        clearDraft();
    }, [clearDraft]);

    const zoomToFeature = useCallback(
        (fid: string) => {
            const feature = featuresRef.current.find((f) => f.properties.fid === fid);
            if (!map || !feature) return;
            const box = geojsonBounds(feature);
            if (!box) return;
            if (box[0] === box[2] && box[1] === box[3]) {
                map.easeTo({ center: [box[0], box[1]], zoom: Math.max(map.getZoom(), 14) });
            } else {
                map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: 90, duration: 700 });
            }
        },
        [map],
    );

    const toGeoJSON = useCallback(
        (): FeatureCollection => ({
            type: "FeatureCollection",
            features: features as unknown as Feature[],
        }),
        [features],
    );

    return useMemo(
        () => ({
            mode,
            setMode,
            features,
            selectedId,
            selectFeature: setSelectedId,
            deleteSelected,
            deleteFeature,
            clearAll,
            zoomToFeature,
            toGeoJSON,
        }),
        [mode, setMode, features, selectedId, deleteSelected, deleteFeature, clearAll, zoomToFeature, toGeoJSON],
    );
}

/* ------------------------------------------------------------------ */
/* Geometry edits                                                      */
/* ------------------------------------------------------------------ */

/** Moves one vertex; circles reinterpret the drag as a radius change. */
function moveVertex(feature: DrawFeature, ring: number, index: number, pos: Position): DrawFeature {
    const geom = feature.geometry;

    if (feature.properties.shape === "circle" && feature.properties.center) {
        const radius = haversine(feature.properties.center, pos);
        return {
            ...feature,
            properties: { ...feature.properties, radius },
            geometry: { type: "Polygon", coordinates: [circlePolygon(feature.properties.center, radius)] },
        };
    }

    if (geom.type === "Point") {
        return { ...feature, geometry: { type: "Point", coordinates: pos } };
    }
    if (geom.type === "LineString") {
        const coords = [...geom.coordinates];
        coords[index] = pos;
        return { ...feature, geometry: { type: "LineString", coordinates: coords } };
    }
    if (geom.type === "Polygon") {
        const rings = geom.coordinates.map((r) => [...r]);
        rings[ring][index] = pos;
        // Keep the ring closed.
        if (index === 0) rings[ring][rings[ring].length - 1] = pos;
        return { ...feature, geometry: { type: "Polygon", coordinates: rings } };
    }
    return feature;
}

/** Translates every coordinate of a feature by a lng/lat delta. */
function translateFeature(feature: DrawFeature, delta: Position): DrawFeature {
    const shift = (p: Position): Position => [p[0] + delta[0], p[1] + delta[1]];
    const geom = feature.geometry;
    const center = feature.properties.center
        ? (shift(feature.properties.center) as [number, number])
        : undefined;

    let geometry = geom;
    if (geom.type === "Point") geometry = { type: "Point", coordinates: shift(geom.coordinates) };
    else if (geom.type === "LineString")
        geometry = { type: "LineString", coordinates: geom.coordinates.map(shift) };
    else if (geom.type === "Polygon")
        geometry = { type: "Polygon", coordinates: geom.coordinates.map((r) => r.map(shift)) };

    return { ...feature, properties: { ...feature.properties, center }, geometry };
}