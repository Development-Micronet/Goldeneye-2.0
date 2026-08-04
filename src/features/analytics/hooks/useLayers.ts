/**
 * Layer manager state.
 *
 * The array is ordered top-first, exactly as it reads in the panel, and is the
 * single source of truth: the map is reconciled against it on every change and
 * after every style reload.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { LayerDef } from "../types/types";
import { geojsonBounds } from "../lib/geo";
import { syncLayers, type SyncState } from "../lib/mapHelpers";

export interface AnalyticsLayersState {
    layers: LayerDef[];
    addLayer: (def: LayerDef) => void;
    removeLayer: (id: string) => void;
    toggleVisibility: (id: string) => void;
    setOpacity: (id: string, opacity: number) => void;
    updateLayer: (id: string, patch: Partial<LayerDef>, structural?: boolean) => void;
    moveLayer: (fromIndex: number, toIndex: number) => void;
    clearLayers: () => void;
}

export const useAnalyticsLayersStore = create<AnalyticsLayersState>((set) => ({
    layers: [],
    addLayer: (def) => set((state) => {
        if (state.layers.some((l) => l.id === def.id)) return state;
        return { layers: [def, ...state.layers] };
    }),
    removeLayer: (id) => set((state) => ({
        layers: state.layers.filter((l) => l.id !== id),
    })),
    toggleVisibility: (id) => set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
    setOpacity: (id, opacity) => set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
    })),
    updateLayer: (id, patch, structural = true) => set((state) => ({
        layers: state.layers.map((l) =>
            l.id === id
                ? ({ ...l, ...patch, rev: structural ? l.rev + 1 : l.rev } as LayerDef)
                : l,
        ),
    })),
    moveLayer: (fromIndex, toIndex) => set((state) => {
        if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= state.layers.length) return state;
        const next = [...state.layers];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
        return { layers: next };
    }),
    clearLayers: () => set({ layers: [] }),
}));

export interface UseLayersResult {
    layers: LayerDef[];
    addLayer: (def: LayerDef) => void;
    removeLayer: (id: string) => void;
    toggleVisibility: (id: string) => void;
    setOpacity: (id: string, opacity: number) => void;
    /** Structural edits bump `rev` so the reconciler rebuilds the layer. */
    updateLayer: (id: string, patch: Partial<LayerDef>, structural?: boolean) => void;
    moveLayer: (fromIndex: number, toIndex: number) => void;
    zoomToLayer: (id: string) => void;
    clearLayers: () => void;
    boundsOf: (def: LayerDef) => [number, number, number, number] | null;
}

export function useLayers(map: MapLibreMap | null, styleEpoch: number): UseLayersResult {
    // Selecting the slice keeps this from re-rendering on unrelated store writes.
    // Actions are stable in zustand, so only `layers` actually drives updates.
    const layers = useAnalyticsLayersStore((state) => state.layers);
    const {
        addLayer,
        removeLayer,
        toggleVisibility,
        setOpacity,
        updateLayer,
        moveLayer,
        clearLayers,
    } = useAnalyticsLayersStore(
        useShallow((state) => ({
            addLayer: state.addLayer,
            removeLayer: state.removeLayer,
            toggleVisibility: state.toggleVisibility,
            setOpacity: state.setOpacity,
            updateLayer: state.updateLayer,
            moveLayer: state.moveLayer,
            clearLayers: state.clearLayers,
        })),
    );

    // Tracks which revision of each definition is materialised on the map.
    const syncState = useRef<SyncState>({ applied: new Map() });

    /* ------------------------------------------------------ reconciliation */
    // A style reload wipes every source, so forget what we thought we applied.
    // Declared first so it runs before the sync effect below on the same commit.
    useEffect(() => {
        syncState.current.applied.clear();
    }, [styleEpoch]);

    useEffect(() => {
        if (!map || !styleEpoch) return;

        // Reconcile immediately. A non-zero `styleEpoch` means `style.load` has
        // fired, which is all `addSource`/`addLayer` require. The old code
        // gated this on `map.isStyleLoaded()`, which is false whenever any
        // source still has tiles in flight — so layers added on a busy map were
        // dropped with no retry.
        syncLayers(map, layers, syncState.current);

        // Repair pass once the map settles.
        //
        // CRITICAL: this listener must be removed on cleanup. The previous
        // `map.once("idle", run)` had none, so a listener registered with an
        // older `layers` closure could fire later; step 1 of syncLayers then
        // removed every source missing from that stale list — deleting the
        // layer that had just been added.
        const repair = () => syncLayers(map, layers, syncState.current);
        map.on("idle", repair);
        return () => {
            map.off("idle", repair);
        };
    }, [map, styleEpoch, layers]);

    /* --------------------------------------------------------- zoom helper */
    const boundsOf = useCallback((def: LayerDef): [number, number, number, number] | null => {
        if (def.bounds) return def.bounds;
        if (def.kind === "geojson") return geojsonBounds(def.data);
        if (def.kind === "image") {
            const xs = def.coordinates.map((c) => c[0]);
            const ys = def.coordinates.map((c) => c[1]);
            return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        }
        return null;
    }, []);

    const zoomToLayer = useCallback(
        (id: string) => {
            const def = layers.find((l) => l.id === id);
            if (!map || !def) return;
            const bounds = boundsOf(def);
            if (bounds) {
                map.fitBounds(
                    [
                        [bounds[0], bounds[1]],
                        [bounds[2], bounds[3]],
                    ],
                    { padding: 80, duration: 900, maxZoom: 15 },
                );
            } else {
                // Global services have no meaningful extent — frame the whole planet.
                map.easeTo({ center: [0, 20], zoom: 1.6, duration: 900 });
            }
        },
        [layers, map, boundsOf],
    );

    return useMemo(
        () => ({
            layers,
            addLayer,
            removeLayer,
            toggleVisibility,
            setOpacity,
            updateLayer,
            moveLayer,
            zoomToLayer,
            clearLayers,
            boundsOf,
        }),
        [
            layers,
            addLayer,
            removeLayer,
            toggleVisibility,
            setOpacity,
            updateLayer,
            moveLayer,
            zoomToLayer,
            clearLayers,
            boundsOf,
        ],
    );
}