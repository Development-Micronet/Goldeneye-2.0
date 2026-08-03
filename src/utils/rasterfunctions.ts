import Projection from "ol/proj/Projection";
import { addProjection, get } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";

/**
 * Marker returned by the GeoTIFF reader when a file has no affine
 * georeferencing. It is not a real CRS — see pixelProjectionFor below.
 */
export const PIXEL_PROJECTION = "PIXEL";


/**
 * Registers a proj4 definition for `code` if OpenLayers doesn't know it.
 *
 * Returns the Projection, or null when the code can't be resolved — always
 * check the result, because OL throws on a null projection.
 */
export function ensureProjection(code: string): Projection | null {
    const existing = get(code);

    if (existing) return existing;

    // WGS84 UTM north (326xx) and south (327xx)
    const utm = code.match(/^EPSG:(326|327)(\d{2})$/);

    if (utm) {
        const south = utm[1] === "327";
        const zone = Number.parseInt(utm[2], 10);

        proj4.defs(
            code,
            `+proj=utm +zone=${zone}${south ? " +south" : ""} +datum=WGS84 +units=m +no_defs`
        );

        register(proj4);

        return get(code);
    }

    console.warn(
        `${code} is not registered. Fetch its definition from https://epsg.io/${code.replace(
            "EPSG:",
            ""
        )}.proj4 and add it with proj4.defs() before loading this layer.`
    );

    return null;
}

/**
 * Builds a pixel-space projection for one raster.
 *
 * Pixel extents differ per image, so a single shared "RASTER:PIXEL" code
 * would be wrong the moment a second ungeoreferenced raster loads with
 * different dimensions. Each layer gets its own code instead.
 */
export function pixelProjectionFor(
    layerId: string,
    width: number,
    height: number
): Projection {
    const code = `${PIXEL_PROJECTION}:${layerId}`;

    const existing = get(code);

    if (existing) return existing;

    const projection = new Projection({
        code,
        units: "pixels",
        extent: [0, 0, width, height],
        // pixel space has no relationship to the globe
        global: false,
        metersPerUnit: 1,
    });

    addProjection(projection);

    return projection;
}

/**
 * Single entry point for layer code: hands back a usable Projection or null.
 */
export function projectionForLayer(layer: {
    id: string;
    projection?: string;
    width?: number;
    height?: number;
}): Projection | null {
    if (!layer.projection) return get("EPSG:3857");

    if (layer.projection === PIXEL_PROJECTION) {
        if (!layer.width || !layer.height) return null;

        return pixelProjectionFor(layer.id, layer.width, layer.height);
    }

    return ensureProjection(layer.projection);
}