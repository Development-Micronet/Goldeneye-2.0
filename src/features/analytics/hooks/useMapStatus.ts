/**
 * Two small read-only hooks:
 *  - `useMapStatus` feeds the instrument strip at the bottom of the screen.
 *  - `useSearch` wraps Nominatim with debouncing and request cancellation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapStatus, SearchResult } from "../types/types";
import { geocode } from "../lib/data";
import { metersPerPixel, parseCoordinates } from "../lib/geo";

const INITIAL_STATUS: MapStatus = {
    cursor: null,
    center: { lng: 0, lat: 20 },
    zoom: 1.6,
    bearing: 0,
    pitch: 0,
    resolution: 0,
};

export function useMapStatus(map: MapLibreMap | null): MapStatus {
    const [status, setStatus] = useState<MapStatus>(INITIAL_STATUS);
    // Camera updates fire per frame; throttle to animation frames.
    const frame = useRef<number | null>(null);

    useEffect(() => {
        if (!map) return;

        const readCamera = () => {
            frame.current = null;
            const center = map.getCenter();
            setStatus((prev) => ({
                ...prev,
                center: { lng: center.lng, lat: center.lat },
                zoom: map.getZoom(),
                bearing: map.getBearing(),
                pitch: map.getPitch(),
                resolution: metersPerPixel(center.lat, map.getZoom()),
            }));
        };

        const onMove = () => {
            if (frame.current === null) frame.current = requestAnimationFrame(readCamera);
        };
        const onMouseMove = (event: { lngLat: { lng: number; lat: number } }) => {
            setStatus((prev) => ({
                ...prev,
                cursor: { lng: event.lngLat.lng, lat: event.lngLat.lat },
            }));
        };
        const onMouseOut = () => setStatus((prev) => ({ ...prev, cursor: null }));

        readCamera();
        map.on("move", onMove);
        map.on("zoom", onMove);
        map.on("rotate", onMove);
        map.on("pitch", onMove);
        map.on("mousemove", onMouseMove);
        map.on("mouseout", onMouseOut);

        return () => {
            map.off("move", onMove);
            map.off("zoom", onMove);
            map.off("rotate", onMove);
            map.off("pitch", onMove);
            map.off("mousemove", onMouseMove);
            map.off("mouseout", onMouseOut);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, [map]);

    return status;
}

/* ------------------------------------------------------------------ */

export interface UseSearchResult {
    query: string;
    setQuery: (value: string) => void;
    results: SearchResult[];
    loading: boolean;
    error: string | null;
    /** Set when the input parses as a coordinate pair instead of a place name. */
    coordinateHit: { lng: number; lat: number } | null;
    clear: () => void;
}

export function useSearch(minLength = 3, debounceMs = 400): UseSearchResult {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coordinateHit, setCoordinateHit] = useState<{ lng: number; lat: number } | null>(null);
    const controller = useRef<AbortController | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        const coords = parseCoordinates(trimmed);
        setCoordinateHit(coords);

        if (coords || trimmed.length < minLength) {
            setResults([]);
            setError(null);
            setLoading(false);
            return;
        }

        const timer = window.setTimeout(async () => {
            controller.current?.abort();
            controller.current = new AbortController();
            setLoading(true);
            setError(null);
            try {
                setResults(await geocode(trimmed, controller.current.signal));
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    setError("Search is unavailable right now. Try again in a moment.");
                }
            } finally {
                setLoading(false);
            }
        }, debounceMs);

        return () => window.clearTimeout(timer);
    }, [query, minLength, debounceMs]);

    const clear = useCallback(() => {
        controller.current?.abort();
        setQuery("");
        setResults([]);
        setError(null);
        setCoordinateHit(null);
    }, []);

    return { query, setQuery, results, loading, error, coordinateHit, clear };
}