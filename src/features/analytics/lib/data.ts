/**
 * External data access. Every service here is public and key-free:
 * Nominatim (geocoding), Overpass (OSM query), Open-Meteo (elevation),
 * plus local file / remote URL GeoJSON loading.
 */
import type { Feature, FeatureCollection, Position } from "geojson";
import type { SearchResult } from "../types/types";

/* ------------------------------------------------------------------ */
/* GeoJSON                                                             */
/* ------------------------------------------------------------------ */

/** Wraps bare geometries and single features into a FeatureCollection. */
export function normaliseGeoJSON(input: unknown): FeatureCollection {
    const value = input as { type?: string };
    if (!value || typeof value !== "object" || !value.type) {
        throw new Error("Not a GeoJSON object.");
    }
    if (value.type === "FeatureCollection") return input as FeatureCollection;
    if (value.type === "Feature") {
        return { type: "FeatureCollection", features: [input as Feature] };
    }
    return {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: input as never }],
    };
}

export async function readGeoJSONFile(file: File): Promise<FeatureCollection> {
    const text = await file.text();
    try {
        return normaliseGeoJSON(JSON.parse(text));
    } catch (error) {
        throw new Error(
            `${file.name} could not be parsed. Expected GeoJSON, got ${(error as Error).message}`,
        );
    }
}

export async function fetchGeoJSON(url: string): Promise<FeatureCollection> {
    const response = await fetch(url, { headers: { Accept: "application/geo+json, application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status} ${response.statusText}`);
    return normaliseGeoJSON(await response.json());
}

/** Property keys most likely to hold a human label, in priority order. */
export function guessLabelField(fc: FeatureCollection): string | undefined {
    const candidates = ["name", "NAME", "title", "label", "place", "ADMIN", "id"];
    const props = fc.features.find((f) => f.properties)?.properties ?? {};
    return candidates.find((key) => key in props);
}

/* ------------------------------------------------------------------ */
/* Overpass (live OpenStreetMap queries)                               */
/* ------------------------------------------------------------------ */

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    tags?: Record<string, string>;
    geometry?: { lat: number; lon: number }[];
}

/** Converts an Overpass JSON response into GeoJSON (nodes + ways). */
export function overpassToGeoJSON(elements: OverpassElement[]): FeatureCollection {
    const features: Feature[] = [];
    for (const el of elements) {
        const properties = { osm_id: el.id, osm_type: el.type, ...(el.tags ?? {}) };
        if (el.type === "node" && el.lat != null && el.lon != null) {
            features.push({
                type: "Feature",
                properties,
                geometry: { type: "Point", coordinates: [el.lon, el.lat] },
            });
        } else if (el.geometry?.length) {
            const coords: Position[] = el.geometry.map((p) => [p.lon, p.lat]);
            const closed =
                coords.length > 3 &&
                coords[0][0] === coords[coords.length - 1][0] &&
                coords[0][1] === coords[coords.length - 1][1];
            features.push({
                type: "Feature",
                properties,
                geometry: closed
                    ? { type: "Polygon", coordinates: [coords] }
                    : { type: "LineString", coordinates: coords },
            });
        }
    }
    return { type: "FeatureCollection", features };
}

/**
 * Runs an Overpass QL snippet. `{{bbox}}` is replaced with the current view,
 * matching the convention used by overpass-turbo.
 */
export async function runOverpassQuery(
    query: string,
    bounds: [number, number, number, number],
): Promise<FeatureCollection> {
    const [w, s, e, n] = bounds;
    const body = query.replace(/\{\{bbox\}\}/g, `${s},${w},${n},${e}`);
    const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body,
    });
    if (!response.ok) throw new Error(`Overpass returned ${response.status}. Try a smaller area.`);
    const json = (await response.json()) as { elements: OverpassElement[] };
    const fc = overpassToGeoJSON(json.elements ?? []);
    if (!fc.features.length) throw new Error("No features found in this view. Zoom to an area with data.");
    return fc;
}

/* ------------------------------------------------------------------ */
/* Nominatim geocoding                                                 */
/* ------------------------------------------------------------------ */

interface NominatimHit {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    class: string;
    boundingbox?: [string, string, string, string];
}

/**
 * Forward geocoding. Nominatim asks for low request rates and a real
 * referrer — debounce in the UI and keep the result count small.
 */
export async function geocode(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const url =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({ q: query, format: "jsonv2", limit: "8", addressdetails: "0" });
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Search failed with ${response.status}`);
    const hits = (await response.json()) as NominatimHit[];
    return hits.map((hit) => ({
        id: String(hit.place_id),
        label: hit.display_name,
        category: `${hit.class} · ${hit.type}`.replace(/_/g, " "),
        lng: parseFloat(hit.lon),
        lat: parseFloat(hit.lat),
        // Nominatim order is [south, north, west, east].
        bounds: hit.boundingbox
            ? ([
                [parseFloat(hit.boundingbox[2]), parseFloat(hit.boundingbox[0])],
                [parseFloat(hit.boundingbox[3]), parseFloat(hit.boundingbox[1])],
            ] as [[number, number], [number, number]])
            : undefined,
    }));
}

/** Reverse geocoding for the click popup. */
export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
    const url =
        "https://nominatim.openstreetmap.org/reverse?" +
        new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "14" });
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = (await response.json()) as { display_name?: string };
        return json.display_name ?? null;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/* Elevation                                                           */
/* ------------------------------------------------------------------ */

/** Open-Meteo elevation (SRTM/Copernicus, no key) — fallback when terrain is off. */
export async function fetchElevation(lng: number, lat: number): Promise<number | null> {
    try {
        const url =
            "https://api.open-meteo.com/v1/elevation?" +
            new URLSearchParams({ latitude: lat.toFixed(5), longitude: lng.toFixed(5) });
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = (await response.json()) as { elevation?: number[] };
        return json.elevation?.[0] ?? null;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

export function googleMapsLink(lng: number, lat: number, zoom = 14): string {
    return `https://www.google.com/maps/@${lat.toFixed(6)},${lng.toFixed(6)},${Math.round(zoom)}z`;
}

export function osmLink(lng: number, lat: number, zoom = 14): string {
    return `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=${Math.round(zoom)}/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/** ISO date offset from today — GIBS imagery lags by a day or two. */
export function daysAgoISO(days: number): string {
    const date = new Date(Date.now() - days * 86_400_000);
    return date.toISOString().slice(0, 10);
}