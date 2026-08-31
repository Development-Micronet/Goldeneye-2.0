import { fromArrayBuffer, fromUrl } from "geotiff";

/**
 * Reads Cloud Optimized GeoTIFFs and renders them onto an existing MapLibre map.
 *
 * The map instance is always passed in as an argument — this module never
 * imports maplibre-gl, and never reads pixels back from the map canvas. Raster
 * pixels come from the GeoTIFF's own sample data, so no cross-origin canvas
 * taint is possible.
 */

export interface RasterBounds {
    west: number;
    south: number;
    east: number;
    north: number;
}

/** Corner coordinates in [lon, lat], clockwise from top-left. */
export type RasterCorners = [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
];

export interface GeoTIFFMetadata {
    width: number;
    height: number;
    bounds: RasterBounds;
    corners: RasterCorners;
    projection: string;
    /** Pixel size in the source CRS units, [x, y]. */
    resolution: [number, number];
    samplesPerPixel: number;
}

export interface AddRasterOptions {
    requestId: string;
    opacity?: number;
    /** Longest edge of the decoded preview, in pixels. Guards against huge COGs. */
    maxDimension?: number;
    /** Render pixels whose bands are all zero as transparent. */
    treatZeroAsNoData?: boolean;
}

export interface AddRasterResult {
    sourceId: string;
    layerId: string;
    bounds: RasterBounds;
    metadata: GeoTIFFMetadata;
}

export class GeoTIFFLoadError extends Error { }

const CORS_MESSAGE =
    "Unable to load historical GeoTIFF. The imagery server must allow CORS requests from this application.";

export const sourceIdFor = (requestId: string) => `history-${requestId}`;
export const layerIdFor = (requestId: string) => `history-layer-${requestId}`;

/* ------------------------------------------------------------------ */
/* Projection handling                                                 */
/* ------------------------------------------------------------------ */

/** GeoTIFF sentinel meaning "defined by the other GeoKeys, not by an EPSG code". */
const USER_DEFINED = 32767;

const WEB_MERCATOR_MAX = 20037508.342789244;

// WGS84 ellipsoid
const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const K0 = 0.9996;

type CRS =
    | { kind: "geographic"; label: string }
    | { kind: "webmercator"; label: string }
    | { kind: "utm"; zone: number; north: boolean; label: string }
    | { kind: "unsupported"; code: number };

const mercatorToLonLat = (x: number, y: number): [number, number] => [
    (x / WEB_MERCATOR_MAX) * 180,
    (Math.atan(Math.exp((y / WEB_MERCATOR_MAX) * Math.PI)) * 360) / Math.PI - 90,
];

/**
 * Inverse UTM projection (Snyder / USGS 1395) on the WGS84 ellipsoid.
 * Accurate to well under a metre inside a zone, which is far below the
 * pixel size of anything we display.
 */
function utmToLonLat(
    easting: number,
    northing: number,
    zone: number,
    north: boolean
): [number, number] {
    const x = easting - 500000;
    const y = north ? northing : northing - 10000000;

    const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
    const m = y / K0;
    const mu =
        m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256));

    const phi1 =
        mu +
        ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
        ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
        ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
        ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

    const ep2 = E2 / (1 - E2);
    const cosPhi1 = Math.cos(phi1);
    const sinPhi1 = Math.sin(phi1);
    const tanPhi1 = Math.tan(phi1);

    const c1 = ep2 * cosPhi1 ** 2;
    const t1 = tanPhi1 ** 2;
    const n1 = A / Math.sqrt(1 - E2 * sinPhi1 ** 2);
    const r1 = (A * (1 - E2)) / (1 - E2 * sinPhi1 ** 2) ** 1.5;
    const d = x / (n1 * K0);

    const lat =
        phi1 -
        ((n1 * tanPhi1) / r1) *
        ((d * d) / 2 -
            ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d ** 4) / 24 +
            ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d ** 6) / 720);

    const lonOffset =
        (d -
            ((1 + 2 * t1 + c1) * d ** 3) / 6 +
            ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d ** 5) / 120) /
        cosPhi1;

    const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

    return [((lon0 + lonOffset) * 180) / Math.PI, (lat * 180) / Math.PI];
}

function crsFromEpsg(code: number): CRS | null {
    if (code === 4326 || code === 4269) return { kind: "geographic", label: `EPSG:${code}` };
    if (code === 3857 || code === 900913 || code === 3395) {
        return { kind: "webmercator", label: `EPSG:${code}` };
    }
    if (code >= 32601 && code <= 32660) {
        return { kind: "utm", zone: code - 32600, north: true, label: `EPSG:${code}` };
    }
    if (code >= 32701 && code <= 32760) {
        return { kind: "utm", zone: code - 32700, north: false, label: `EPSG:${code}` };
    }
    return null;
}

/**
 * Works out the raster's CRS, including the user-defined (32767) case where
 * the projection is described by ProjectionGeoKey or the Transverse Mercator
 * parameter keys instead of an EPSG code.
 */
function resolveCRS(geoKeys: any): CRS {
    const projected: number | undefined = geoKeys?.ProjectedCSTypeGeoKey;
    const geographic: number | undefined = geoKeys?.GeographicTypeGeoKey;

    if (projected && projected !== USER_DEFINED) {
        const crs = crsFromEpsg(projected);
        if (crs) return crs;
        return { kind: "unsupported", code: projected };
    }

    if (projected === USER_DEFINED) {
        // ProjectionGeoKey: 16001–16060 = UTM 1N–60N, 16101–16160 = UTM 1S–60S.
        const projection: number | undefined = geoKeys?.ProjectionGeoKey;
        if (projection && projection >= 16001 && projection <= 16060) {
            const zone = projection - 16000;
            return { kind: "utm", zone, north: true, label: `EPSG:${32600 + zone}` };
        }
        if (projection && projection >= 16101 && projection <= 16160) {
            const zone = projection - 16100;
            return { kind: "utm", zone, north: false, label: `EPSG:${32700 + zone}` };
        }

        // CT_TransverseMercator === 1. Derive the UTM zone from the central meridian.
        if (geoKeys?.ProjCoordTransGeoKey === 1) {
            const lon0 = geoKeys.ProjNatOriginLongGeoKey ?? geoKeys.ProjCenterLongGeoKey;
            const falseNorthing = geoKeys.ProjFalseNorthingGeoKey ?? 0;
            if (typeof lon0 === "number" && Number.isFinite(lon0)) {
                const zone = Math.floor((lon0 + 180) / 6) + 1;
                const north = falseNorthing === 0;
                return {
                    kind: "utm",
                    zone,
                    north,
                    label: `EPSG:${(north ? 32600 : 32700) + zone}`,
                };
            }
        }
    }

    if (geographic && geographic !== USER_DEFINED) {
        const crs = crsFromEpsg(geographic);
        if (crs) return crs;
    }

    // No projection keys at all — GeoTIFFs written this way are normally lon/lat.
    if (!projected && !geographic) return { kind: "geographic", label: "EPSG:4326" };

    return { kind: "unsupported", code: projected || geographic || 0 };
}

function projectPoint(x: number, y: number, crs: CRS): [number, number] {
    switch (crs.kind) {
        case "geographic":
            return [x, y];
        case "webmercator":
            return mercatorToLonLat(x, y);
        case "utm":
            return utmToLonLat(x, y, crs.zone, crs.north);
        default:
            throw new GeoTIFFLoadError(
                `Unsupported projection EPSG:${crs.code}. Reproject this raster to EPSG:4326 on the server.`
            );
    }
}

const isValidLonLat = (lon: number, lat: number) =>
    Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180.001 && Math.abs(lat) <= 90.001;

/**
 * Converts a source-CRS bounding box to WGS84.
 *
 * All four corners are transformed rather than just two: a rectangle in a
 * projected CRS is not a rectangle in lon/lat, so the corners carry the slight
 * rotation while the bounds give an enclosing box for fitBounds.
 */
function toWGS84(
    bbox: number[],
    crs: CRS
): { bounds: RasterBounds; corners: RasterCorners } {
    const [minX, minY, maxX, maxY] = bbox;

    const topLeft = projectPoint(minX, maxY, crs);
    const topRight = projectPoint(maxX, maxY, crs);
    const bottomRight = projectPoint(maxX, minY, crs);
    const bottomLeft = projectPoint(minX, minY, crs);

    const corners: RasterCorners = [topLeft, topRight, bottomRight, bottomLeft];

    if (corners.some(([lon, lat]) => !isValidLonLat(lon, lat))) {
        throw new GeoTIFFLoadError(
            "The GeoTIFF's bounds fall outside valid longitude/latitude after reprojection."
        );
    }

    const lons = corners.map(([lon]) => lon);
    const lats = corners.map(([, lat]) => lat);

    return {
        corners,
        bounds: {
            west: Math.min(...lons),
            south: Math.min(...lats),
            east: Math.max(...lons),
            north: Math.max(...lats),
        },
    };
}

/* ------------------------------------------------------------------ */
/* Opening                                                             */
/* ------------------------------------------------------------------ */

/**
 * Opens a COG, preferring HTTP range requests. Falls back to downloading the
 * whole file if the server doesn't support ranges.
 */
async function openTiff(cogUrl: string) {
    try {
        return await fromUrl(cogUrl);
    } catch (rangeError) {
        try {
            const response = await fetch(cogUrl);
            if (!response.ok) {
                throw new GeoTIFFLoadError(`The imagery server returned ${response.status}.`);
            }
            const buffer = await response.arrayBuffer();
            return await fromArrayBuffer(buffer);
        } catch (error: any) {
            if (error instanceof GeoTIFFLoadError) throw error;
            // A blocked cross-origin fetch surfaces as an opaque TypeError.
            if (error?.name === "TypeError" || rangeError instanceof TypeError) {
                throw new GeoTIFFLoadError(CORS_MESSAGE);
            }
            throw new GeoTIFFLoadError(error?.message || "The file could not be read as a GeoTIFF.");
        }
    }
}

function readGeoreferencing(image: any) {
    const geoKeys = image.getGeoKeys() || {};
    const crs = resolveCRS(geoKeys);

    let bbox: number[];
    try {
        bbox = image.getBoundingBox();
    } catch {
        throw new GeoTIFFLoadError("The GeoTIFF has no georeferencing information.");
    }

    if (!bbox || bbox.length < 4 || bbox.some((value) => !Number.isFinite(value))) {
        throw new GeoTIFFLoadError("The GeoTIFF has invalid bounds.");
    }

    const { bounds, corners } = toWGS84(bbox, crs);
    const label = crs.kind === "unsupported" ? `EPSG:${crs.code}` : crs.label;

    return { bounds, corners, projection: label };
}

/**
 * Reads geographic metadata without decoding any pixels.
 */
export async function readGeoTIFFMetadata(cogUrl: string): Promise<GeoTIFFMetadata> {
    if (!cogUrl) throw new GeoTIFFLoadError("This result has no GeoTIFF to load.");

    const tiff = await openTiff(cogUrl);
    const image = await tiff.getImage();

    const { bounds, corners, projection } = readGeoreferencing(image);
    const resolution = image.getResolution();

    return {
        width: image.getWidth(),
        height: image.getHeight(),
        bounds,
        corners,
        projection,
        resolution: [Math.abs(resolution[0]), Math.abs(resolution[1])],
        samplesPerPixel: image.getSamplesPerPixel(),
    };
}

/* ------------------------------------------------------------------ */
/* Decoding to an image                                                */
/* ------------------------------------------------------------------ */

/**
 * Scales non-8-bit sample data into 0-255 using a 2nd/98th percentile stretch,
 * which keeps outliers from flattening the whole image.
 */
function buildStretch(values: ArrayLike<number>): (value: number) => number {
    if (values instanceof Uint8Array || values instanceof Uint8ClampedArray) {
        return (value) => value;
    }

    const sampleStep = Math.max(1, Math.floor(values.length / 50000));
    const sampled: number[] = [];
    for (let i = 0; i < values.length; i += sampleStep) {
        const value = values[i];
        if (Number.isFinite(value)) sampled.push(value);
    }

    if (!sampled.length) return () => 0;

    sampled.sort((a, b) => a - b);
    const low = sampled[Math.floor(sampled.length * 0.02)];
    const high = sampled[Math.floor(sampled.length * 0.98)];
    const range = high - low;

    if (!range) return (value) => (value > low ? 255 : 0);

    return (value) => {
        const scaled = ((value - low) / range) * 255;
        return scaled < 0 ? 0 : scaled > 255 ? 255 : scaled;
    };
}

async function renderTiffToDataURL(
    cogUrl: string,
    options: AddRasterOptions
): Promise<{ dataUrl: string; metadata: GeoTIFFMetadata }> {
    const { maxDimension = 2048, treatZeroAsNoData = true } = options;

    const tiff = await openTiff(cogUrl);
    const image = await tiff.getImage();

    const { bounds, corners, projection } = readGeoreferencing(image);

    const fullWidth = image.getWidth();
    const fullHeight = image.getHeight();
    const samples = image.getSamplesPerPixel();
    const resolution = image.getResolution();

    // Decode at a capped size; geotiff resamples for us.
    const scale = Math.min(1, maxDimension / Math.max(fullWidth, fullHeight));
    const width = Math.max(1, Math.round(fullWidth * scale));
    const height = Math.max(1, Math.round(fullHeight * scale));

    let raster: any;
    try {
        raster = await image.readRasters({ interleave: true, width, height });
    } catch (error: any) {
        throw new GeoTIFFLoadError(
            error?.name === "TypeError" ? CORS_MESSAGE : "The GeoTIFF pixel data could not be decoded."
        );
    }

    const stretch = buildStretch(raster);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new GeoTIFFLoadError("Could not create a canvas to draw the raster.");

    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
        const src = i * samples;
        const dst = i * 4;

        let r: number;
        let g: number;
        let b: number;
        let a = 255;

        if (samples === 1) {
            r = g = b = stretch(raster[src]);
        } else if (samples === 2) {
            r = g = b = stretch(raster[src]);
            a = stretch(raster[src + 1]);
        } else {
            r = stretch(raster[src]);
            g = stretch(raster[src + 1]);
            b = stretch(raster[src + 2]);
            if (samples >= 4) a = stretch(raster[src + 3]);
        }

        if (treatZeroAsNoData && r === 0 && g === 0 && b === 0 && samples < 4) {
            a = 0;
        }

        imageData.data[dst] = r;
        imageData.data[dst + 1] = g;
        imageData.data[dst + 2] = b;
        imageData.data[dst + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);

    return {
        // Canvas built from raw samples, never from a cross-origin image, so this
        // cannot throw a SecurityError.
        dataUrl: canvas.toDataURL("image/png"),
        metadata: {
            width: fullWidth,
            height: fullHeight,
            bounds,
            corners,
            projection,
            resolution: [Math.abs(resolution[0]), Math.abs(resolution[1])],
            samplesPerPixel: samples,
        },
    };
}

/* ------------------------------------------------------------------ */
/* Map integration                                                     */
/* ------------------------------------------------------------------ */

/**
 * Removes a historical raster layer and source if present. Safe to call when
 * neither exists.
 */
export function removeGeoTIFFFromMap(map: any, requestId: string): void {
    if (!map) return;

    const layerId = layerIdFor(requestId);
    const sourceId = sourceIdFor(requestId);

    try {
        if (map.getLayer?.(layerId)) map.removeLayer(layerId);
    } catch (error) {
        console.warn(`Could not remove layer ${layerId}:`, error);
    }

    try {
        if (map.getSource?.(sourceId)) map.removeSource(sourceId);
    } catch (error) {
        console.warn(`Could not remove source ${sourceId}:`, error);
    }
}

/**
 * Decodes a COG and adds it to the supplied MapLibre map as an image source
 * positioned by its own georeferencing.
 */
export async function addGeoTIFFToMap(
    map: any,
    cogUrl: string,
    options: AddRasterOptions
): Promise<AddRasterResult> {
    if (!map) throw new GeoTIFFLoadError("The map is not ready yet.");
    if (!cogUrl) throw new GeoTIFFLoadError("This result has no GeoTIFF to display.");

    const { requestId, opacity = 1 } = options;

    const { dataUrl, metadata } = await renderTiffToDataURL(cogUrl, options);

    const sourceId = sourceIdFor(requestId);
    const layerId = layerIdFor(requestId);

    // Replace any previous version of this same raster.
    removeGeoTIFFFromMap(map, requestId);

    try {
        map.addSource(sourceId, {
            type: "image",
            url: dataUrl,
            // Reprojected corners, clockwise from top-left.
            coordinates: metadata.corners,
        });

        // No beforeId, so the raster sits on top of the basemap.
        map.addLayer({
            id: layerId,
            type: "raster",
            source: sourceId,
            paint: {
                "raster-opacity": opacity,
                "raster-fade-duration": 0,
            },
        });
    } catch (error: any) {
        removeGeoTIFFFromMap(map, requestId);
        throw new GeoTIFFLoadError(error?.message || "The raster could not be added to the map.");
    }

    return { sourceId, layerId, bounds: metadata.bounds, metadata };
}

/**
 * Fits the map to a raster's bounds.
 */
export function fitMapToBounds(map: any, bounds: RasterBounds): void {
    if (!map || !bounds) return;

    map.fitBounds(
        [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
        ],
        { padding: 60, duration: 800 }
    );
}

/**
 * Downloads the original GeoTIFF. Falls back to opening the URL in a new tab
 * when the server blocks a cross-origin fetch.
 */
export async function downloadGeoTIFF(cogUrl: string, fileName: string): Promise<void> {
    if (!cogUrl) throw new GeoTIFFLoadError("This result has no GeoTIFF to download.");

    try {
        const response = await fetch(cogUrl);
        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName.endsWith(".tif") ? fileName : `${fileName}.tif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
        window.open(cogUrl, "_blank", "noopener,noreferrer");
    }
}