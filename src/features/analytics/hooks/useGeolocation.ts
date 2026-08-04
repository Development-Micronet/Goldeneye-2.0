/**
 * Browser geolocation with an accuracy circle, continuous tracking and an
 * optional follow mode that keeps the camera centred on the user.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import { circlePolygon } from "../lib/geo";

const SRC_ID = "geolocation";
export const GEO_LAYER_IDS = ["geo-accuracy", "geo-accuracy-outline", "geo-dot"];

export interface GeoFix {
    lng: number;
    lat: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

export interface UseGeolocationResult {
    fix: GeoFix | null;
    tracking: boolean;
    follow: boolean;
    error: string | null;
    locateOnce: () => void;
    toggleTracking: () => void;
    toggleFollow: () => void;
}

export function useGeolocation(map: MapLibreMap | null, styleEpoch: number): UseGeolocationResult {
    const [fix, setFix] = useState<GeoFix | null>(null);
    const [tracking, setTracking] = useState(false);
    const [follow, setFollow] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const watchId = useRef<number | null>(null);
    const followRef = useRef(follow);

    useEffect(() => { followRef.current = follow; }, [follow]);

    /* ----------------------------------------------------- map primitives */
    useEffect(() => {
        if (!map || !styleEpoch) return;
        if (!map.getSource(SRC_ID)) {
            map.addSource(SRC_ID, {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
        }
        if (!map.getLayer("geo-accuracy")) {
            map.addLayer({
                id: "geo-accuracy",
                type: "fill",
                source: SRC_ID,
                filter: ["==", ["geometry-type"], "Polygon"],
                paint: { "fill-color": "#3b82f6", "fill-opacity": 0.16 },
            });
            map.addLayer({
                id: "geo-accuracy-outline",
                type: "line",
                source: SRC_ID,
                filter: ["==", ["geometry-type"], "Polygon"],
                paint: { "line-color": "#60a5fa", "line-width": 1 },
            });
            map.addLayer({
                id: "geo-dot",
                type: "circle",
                source: SRC_ID,
                filter: ["==", ["geometry-type"], "Point"],
                paint: {
                    "circle-radius": 6,
                    "circle-color": "#3b82f6",
                    "circle-stroke-width": 3,
                    "circle-stroke-color": "#ffffff",
                },
            });
        }
    }, [map, styleEpoch]);

    /* --------------------------------------------------------- rendering */
    useEffect(() => {
        if (!map) return;
        const source = map.getSource(SRC_ID) as GeoJSONSource | undefined;
        if (!source) return;

        const features: Feature[] = fix
            ? [
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "Polygon",
                        coordinates: [circlePolygon([fix.lng, fix.lat], Math.max(fix.accuracy, 5), 64)],
                    },
                },
                {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "Point", coordinates: [fix.lng, fix.lat] },
                },
            ]
            : [];
        source.setData({ type: "FeatureCollection", features } as FeatureCollection);
    }, [map, fix, styleEpoch]);

    /* ---------------------------------------------------------- position */
    const handlePosition = useCallback(
        (position: GeolocationPosition, fly: boolean) => {
            const next: GeoFix = {
                lng: position.coords.longitude,
                lat: position.coords.latitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                timestamp: position.timestamp,
            };
            setFix(next);
            setError(null);
            if (map && (fly || followRef.current)) {
                map.easeTo({
                    center: [next.lng, next.lat],
                    zoom: Math.max(map.getZoom(), 14),
                    duration: 1200,
                });
            }
        },
        [map],
    );

    const handleError = useCallback((err: GeolocationPositionError) => {
        const messages: Record<number, string> = {
            1: "Location permission denied. Allow access in your browser settings.",
            2: "Position unavailable. Check that location services are on.",
            3: "Timed out waiting for a fix. Try again outdoors.",
        };
        setError(messages[err.code] ?? err.message);
        setTracking(false);
    }, []);

    const locateOnce = useCallback(() => {
        if (!navigator.geolocation) {
            setError("This browser does not expose geolocation.");
            return;
        }
        navigator.geolocation.getCurrentPosition((pos) => handlePosition(pos, true), handleError, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
        });
    }, [handlePosition, handleError]);

    const toggleTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError("This browser does not expose geolocation.");
            return;
        }
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
            setTracking(false);
            setFollow(false);
            return;
        }
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => handlePosition(pos, false),
            handleError,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
        );
        setTracking(true);
        locateOnce();
    }, [handlePosition, handleError, locateOnce]);

    const toggleFollow = useCallback(() => {
        setFollow((prev) => {
            const next = !prev;
            if (next && watchId.current === null) toggleTracking();
            return next;
        });
    }, [toggleTracking]);

    useEffect(
        () => () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        },
        [],
    );

    return { fix, tracking, follow, error, locateOnce, toggleTracking, toggleFollow };
}