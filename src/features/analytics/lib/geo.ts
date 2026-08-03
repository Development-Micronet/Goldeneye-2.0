/**
 * Geodesic maths and human-readable formatting.
 *
 * Everything here is pure and dependency-free (no turf, no proj4) so it can be
 * unit tested in isolation and shared by the draw engine, the measure tooltip
 * and the status bar.
 */
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export const EARTH_RADIUS = 6371008.8; // mean radius, metres (IUGG)

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/* ------------------------------------------------------------------ */
/* Distance / bearing                                                  */
/* ------------------------------------------------------------------ */

/** Great-circle distance between two [lng, lat] pairs, in metres. */
export function haversine(a: Position, b: Position): number {
    const dLat = rad(b[1] - a[1]);
    const dLng = rad(a[0] === b[0] ? 0 : b[0] - a[0]);
    const lat1 = rad(a[1]);
    const lat2 = rad(b[1]);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cumulative length of a line string, in metres. */
export function lineLength(coords: Position[]): number {
    let total = 0;
    for (let i = 1; i < coords.length; i++) total += haversine(coords[i - 1], coords[i]);
    return total;
}

/** Initial (forward) bearing from a to b, in degrees clockwise from north. */
export function bearing(a: Position, b: Position): number {
    const lat1 = rad(a[1]);
    const lat2 = rad(b[1]);
    const dLng = rad(b[0] - a[0]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Compass point (16-wind) for a bearing. */
export function compassPoint(deg360: number): string {
    const points = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ];
    return points[Math.round(deg360 / 22.5) % 16];
}

/** Point at `distance` metres along `brng` from `origin`. */
export function destination(origin: Position, distance: number, brng: number): Position {
    const d = distance / EARTH_RADIUS;
    const b = rad(brng);
    const lat1 = rad(origin[1]);
    const lng1 = rad(origin[0]);
    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
    );
    const lng2 =
        lng1 +
        Math.atan2(
            Math.sin(b) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
        );
    return [((deg(lng2) + 540) % 360) - 180, deg(lat2)];
}

/* ------------------------------------------------------------------ */
/* Area                                                                */
/* ------------------------------------------------------------------ */

/** Spherical excess area of a closed ring, in square metres. */
function ringArea(ring: Position[]): number {
    if (ring.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < ring.length; i++) {
        const p1 = ring[i];
        const p2 = ring[(i + 1) % ring.length];
        total += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
    }
    return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

/** Polygon area (outer ring minus holes), in square metres. */
export function polygonArea(rings: Position[][]): number {
    if (!rings.length) return 0;
    return rings.reduce((acc, ring, i) => acc + (i === 0 ? ringArea(ring) : -ringArea(ring)), 0);
}

/** Approximate visual centre of a ring (average of vertices). */
export function ringCentroid(ring: Position[]): Position {
    const pts = ring.slice(0, -1).length ? ring.slice(0, -1) : ring;
    const sum = pts.reduce<[number, number]>((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
    return [sum[0] / pts.length, sum[1] / pts.length];
}

/** Point at the halfway mark of a line, used to anchor length labels. */
export function lineMidpoint(coords: Position[]): Position {
    if (coords.length < 2) return coords[0] ?? [0, 0];
    const half = lineLength(coords) / 2;
    let walked = 0;
    for (let i = 1; i < coords.length; i++) {
        const seg = haversine(coords[i - 1], coords[i]);
        if (walked + seg >= half) {
            const t = seg === 0 ? 0 : (half - walked) / seg;
            return [
                coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
                coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
            ];
        }
        walked += seg;
    }
    return coords[coords.length - 1];
}

/* ------------------------------------------------------------------ */
/* Shape builders                                                      */
/* ------------------------------------------------------------------ */

/** Geodesic circle approximated with `steps` vertices. */
export function circlePolygon(center: Position, radiusMeters: number, steps = 96): Position[] {
    const ring: Position[] = [];
    for (let i = 0; i < steps; i++) ring.push(destination(center, radiusMeters, (i * 360) / steps));
    ring.push(ring[0]);
    return ring;
}

/** Axis-aligned rectangle ring from two opposite corners. */
export function rectangleRing(a: Position, b: Position): Position[] {
    const [x1, x2] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
    const [y1, y2] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
    return [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
    ];
}

/* ------------------------------------------------------------------ */
/* Bounds                                                              */
/* ------------------------------------------------------------------ */

export type BBox = [number, number, number, number];

function extendBBox(box: BBox, pos: Position): void {
    box[0] = Math.min(box[0], pos[0]);
    box[1] = Math.min(box[1], pos[1]);
    box[2] = Math.max(box[2], pos[0]);
    box[3] = Math.max(box[3], pos[1]);
}

function walkCoords(geom: Geometry, box: BBox): void {
    if (geom.type === "GeometryCollection") {
        geom.geometries.forEach((g) => walkCoords(g, box));
        return;
    }
    const stack: unknown[] = [geom.coordinates];
    while (stack.length) {
        const item = stack.pop();
        if (!Array.isArray(item)) continue;
        if (typeof item[0] === "number") extendBBox(box, item as Position);
        else stack.push(...item);
    }
}

/** Bounding box of any GeoJSON object, or null when it has no geometry. */
export function geojsonBounds(input: FeatureCollection | Feature | Geometry): BBox | null {
    const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
    const features: Feature[] =
        "type" in input && input.type === "FeatureCollection"
            ? input.features
            : "type" in input && input.type === "Feature"
                ? [input as Feature]
                : [{ type: "Feature", properties: {}, geometry: input as Geometry }];
    features.forEach((f) => f.geometry && walkCoords(f.geometry, box));
    return Number.isFinite(box[0]) ? box : null;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatDistance(meters: number): string {
    if (!Number.isFinite(meters)) return "—";
    if (meters < 1000) return `${meters.toFixed(meters < 10 ? 2 : 0)} m`;
    return `${(meters / 1000).toFixed(meters < 100000 ? 2 : 1)} km`;
}

export function formatArea(sqm: number): string {
    if (!Number.isFinite(sqm)) return "—";
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    if (sqm < 1_000_000) return `${(sqm / 10000).toFixed(2)} ha`;
    return `${(sqm / 1_000_000).toFixed(2)} km²`;
}

export function formatBearing(b: number): string {
    return `${b.toFixed(1)}° ${compassPoint(b)}`;
}

/** Decimal degrees with a fixed precision, e.g. "12.345678". */
export function formatDegrees(value: number, digits = 6): string {
    return value.toFixed(digits);
}

/** Degrees / minutes / seconds, e.g. 21°08'42.5"N. */
export function toDMS(value: number, axis: "lat" | "lng"): string {
    const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    const abs = Math.abs(value);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = (mFloat - m) * 60;
    return `${d}°${String(m).padStart(2, "0")}'${s.toFixed(1).padStart(4, "0")}"${hemi}`;
}

export function formatLngLat(lng: number, lat: number, mode: "dd" | "dms" = "dd"): string {
    return mode === "dd"
        ? `${formatDegrees(lat)}, ${formatDegrees(lng)}`
        : `${toDMS(lat, "lat")} ${toDMS(lng, "lng")}`;
}

/** Ground resolution (metres per screen pixel) for a latitude and zoom. */
export function metersPerPixel(lat: number, zoom: number, tileSize = 512): number {
    return (
        (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS) /
        (tileSize * Math.pow(2, zoom))
    );
}

/** Rounded 1/2/5 scale-bar step that fits within `maxPx` pixels. */
export function niceScale(maxPx: number, mPerPx: number): { label: string; px: number } {
    const maxMeters = maxPx * mPerPx;
    const pow = Math.pow(10, Math.floor(Math.log10(maxMeters)));
    const candidates = [1, 2, 5, 10].map((m) => m * pow).filter((v) => v <= maxMeters);
    const meters = candidates.length ? candidates[candidates.length - 1] : maxMeters;
    return { label: formatDistance(meters), px: meters / mPerPx };
}

/** Parses "12.34, 56.78", "12.34 56.78" or "12°N 45°E"-ish input. */
export function parseCoordinates(input: string): { lng: number; lat: number } | null {
    const cleaned = input.trim().replace(/[;|]/g, ",");
    const decimal = cleaned.match(
        /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/,
    );
    if (decimal) {
        const a = parseFloat(decimal[1]);
        const b = parseFloat(decimal[2]);
        // Assume lat,lng (the common convention) unless that is out of range.
        if (Math.abs(a) <= 90) return { lat: a, lng: b };
        if (Math.abs(b) <= 90) return { lat: b, lng: a };
    }
    return null;
}

/** Clamp a longitude into [-180, 180] after globe wrapping. */
export function wrapLng(lng: number): number {
    return ((((lng + 180) % 360) + 360) % 360) - 180;
}