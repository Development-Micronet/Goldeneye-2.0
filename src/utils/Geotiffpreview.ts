import * as GeoTIFF from "geotiff";
import type { GeoTIFFImage } from "geotiff";

/**
 * Projection code used when a file carries no affine georeferencing.
 * The extent is then image pixels, not map coordinates.
 */
export const PIXEL_PROJECTION = "PIXEL";


/** Chrome tolerates 16384px; Safari caps total canvas area near 16.7M px. */
const MAX_PREVIEW_DIM = 4096;
const MAX_PREVIEW_AREA = 16_000_000;

export interface RasterPreview {
    imageUrl: string;

    /** Map extent when georeferenced, otherwise [0, 0, width, height] */
    extent: number[];

    projection: string;

    /** false when the file had no affine transform and we fell back to pixels */
    georeferenced: boolean;

    /** Human-readable reason, present only when georeferenced is false */
    warning?: string;

    /** Full-resolution dimensions */
    width: number;
    height: number;

    /** Dimensions of the PNG actually produced */
    previewWidth: number;
    previewHeight: number;

    /** Metres per pixel, when ModelPixelScale is present */
    resolution?: number;

    /** From TIFFTAG_DATETIME, when present */
    capturedAt?: number;
}

/* ------------------------------------------------------------------ *
 * Georeferencing
 * ------------------------------------------------------------------ */

interface Georeference {
    extent: number[];
    projection: string;
    georeferenced: boolean;
    warning?: string;
    resolution?: number;
}

const readProjection = (image: GeoTIFFImage): string => {
    const geoKeys = image.getGeoKeys() as Record<string, number> | undefined;

    const projected = geoKeys?.ProjectedCSTypeGeoKey;
    const geographic = geoKeys?.GeographicTypeGeoKey;

    // 32767 means "user-defined", which is not an EPSG code
    if (projected && projected !== 32767) return `EPSG:${projected}`;
    if (geographic && geographic !== 32767) return `EPSG:${geographic}`;

    return "EPSG:4326";
};

/**
 * Explains *why* an affine transform is missing, so the popup can say
 * something more useful than "failed".
 */
const describeMissingTransform = (image: GeoTIFFImage): string => {
    const dir = image.getFileDirectory() as Record<string, any> | undefined;

    const tiePoints = dir?.ModelTiepoint as number[] | undefined;
    const hasTransform = Array.isArray(dir?.ModelTransformation);
    const hasPixelScale = Array.isArray(dir?.ModelPixelScale);

    if (Array.isArray(tiePoints) && tiePoints.length > 6) {
        const gcps = Math.floor(tiePoints.length / 6);

        return `This file is georeferenced with ${gcps} ground control points rather than a single transform. Displaying it in map coordinates needs a warp step (gdalwarp), so it is shown in pixel space.`;
    }

    if (Array.isArray(tiePoints) && !hasPixelScale && !hasTransform) {
        return "This file has a tie point but no pixel scale, so its ground size is unknown. Shown in pixel space.";
    }

    return "This file has no georeferencing tags (ModelPixelScale, ModelTiepoint or ModelTransformation). Shown in pixel space.";
};

const readGeoreference = (
    image: GeoTIFFImage,
    width: number,
    height: number
): Georeference => {
    const pixelScale = (image.getFileDirectory() as Record<string, any>)
        ?.ModelPixelScale as number[] | undefined;

    const resolution =
        Array.isArray(pixelScale) && Number.isFinite(pixelScale[0])
            ? Math.abs(pixelScale[0])
            : undefined;

    try {
        const bbox = image.getBoundingBox();

        // A degenerate box is as useless as a missing one
        if (
            !bbox ||
            bbox.some((value) => !Number.isFinite(value)) ||
            bbox[2] === bbox[0] ||
            bbox[3] === bbox[1]
        ) {
            throw new Error("Degenerate bounding box");
        }

        return {
            extent: [bbox[0], bbox[1], bbox[2], bbox[3]],
            projection: readProjection(image),
            georeferenced: true,
            resolution,
        };
    } catch {
        // geotiff throws "The image does not have an affine transformation."
        return {
            extent: [0, 0, width, height],
            projection: PIXEL_PROJECTION,
            georeferenced: false,
            warning: describeMissingTransform(image),
            resolution,
        };
    }
};

const readCaptureDate = (image: GeoTIFFImage): number | undefined => {
    const dir = image.getFileDirectory() as Record<string, any> | undefined;
    const raw = (dir?.DateTime ?? dir?.TIFFTAG_DATETIME) as string | undefined;

    if (typeof raw !== "string") return undefined;

    // TIFF spec format: "YYYY:MM:DD HH:MM:SS"
    const iso = raw.replace(
        /^(\d{4}):(\d{2}):(\d{2})/,
        (_match, y, m, d) => `${y}-${m}-${d}`
    );

    const parsed = Date.parse(iso);

    return Number.isNaN(parsed) ? undefined : parsed;
};

/* ------------------------------------------------------------------ *
 * Sizing and overview selection
 * ------------------------------------------------------------------ */

const previewSize = (width: number, height: number) => {
    const longest = Math.max(width, height);

    let scale = Math.min(1, MAX_PREVIEW_DIM / longest);

    if (width * height * scale * scale > MAX_PREVIEW_AREA) {
        scale = Math.sqrt(MAX_PREVIEW_AREA / (width * height));
    }

    return {
        previewWidth: Math.max(1, Math.round(width * scale)),
        previewHeight: Math.max(1, Math.round(height * scale)),
    };
};

/**
 * Prefers the smallest reduced-resolution overview that still covers the
 * preview size. A 10980² Sentinel scene decodes ~30x less data this way.
 */
const pickPreviewImage = async (
    tiff: GeoTIFF.GeoTIFF,
    fullResImage: GeoTIFFImage,
    targetDim: number
): Promise<GeoTIFFImage> => {
    const count = await tiff.getImageCount();

    let chosen = fullResImage;
    let chosenDim = Math.max(chosen.getWidth(), chosen.getHeight());

    for (let index = 1; index < count; index += 1) {
        const candidate = await tiff.getImage(index);
        const dir = candidate.getFileDirectory() as Record<string, any>;

        // bit 0 of NewSubfileType marks a reduced-resolution overview;
        // other IFDs may be masks or pages, which we must not display
        const isOverview = ((dir?.NewSubfileType ?? 0) & 1) === 1;

        if (!isOverview) continue;

        const dim = Math.max(candidate.getWidth(), candidate.getHeight());

        if (dim >= targetDim && dim < chosenDim) {
            chosen = candidate;
            chosenDim = dim;
        }
    }

    return chosen;
};

/* ------------------------------------------------------------------ *
 * Contrast stretch
 * ------------------------------------------------------------------ */

interface Stretch {
    min: number;
    span: number;
}

/**
 * 16-bit and float imagery rarely uses its full theoretical range — a
 * Sentinel band peaks near 3000 out of 65535, so dividing by the maximum
 * renders it almost black. A 2–98 percentile stretch per band fixes that.
 */
const bandStretch = (
    values: ArrayLike<number>,
    samplesPerPixel: number,
    band: number,
    nodata?: number
): Stretch => {
    const pixels = Math.floor(values.length / samplesPerPixel);
    const step = Math.max(1, Math.floor(pixels / 100_000));

    const sample: number[] = [];

    for (let i = 0; i < pixels; i += step) {
        const value = values[i * samplesPerPixel + band];

        if (!Number.isFinite(value)) continue;
        if (nodata !== undefined && value === nodata) continue;

        sample.push(value);
    }

    if (sample.length === 0) return { min: 0, span: 1 };

    sample.sort((a, b) => a - b);

    const low = sample[Math.floor(sample.length * 0.02)];
    const high = sample[Math.floor(sample.length * 0.98)];

    const span = high - low;

    return span > 0
        ? { min: low, span }
        : { min: sample[0], span: Math.abs(sample[0]) || 1 };
};

const readNodata = (image: GeoTIFFImage): number | undefined => {
    const raw = (image.getFileDirectory() as Record<string, any>)?.GDAL_NODATA;

    if (typeof raw !== "string") return undefined;

    const parsed = Number.parseFloat(raw);

    return Number.isNaN(parsed) ? undefined : parsed;
};

/* ------------------------------------------------------------------ *
 * Metadata only
 * ------------------------------------------------------------------ */

export type RasterGeoreference = Omit<
    RasterPreview,
    "imageUrl" | "previewWidth" | "previewHeight"
>;

/**
 * Reads georeferencing and metadata without decoding a single pixel.
 *
 * Use this when the display image comes from the server (previewUrl or a
 * COG) and you only need extent, CRS and dimensions to place the layer.
 * It skips readRasters, the contrast stretch, the canvas and the PNG
 * encode — on a large scene that is the difference between milliseconds
 * and tens of seconds.
 */
export async function readGeoTIFFMetadata(
    file: File
): Promise<RasterGeoreference> {
    let tiff: GeoTIFF.GeoTIFF;

    try {
        tiff = await GeoTIFF.fromArrayBuffer(await file.arrayBuffer());
    } catch {
        throw new Error(
            `${file.name} is not a readable TIFF. Export it as a GeoTIFF and try again.`
        );
    }

    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();

    const geo = readGeoreference(image, width, height);

    return {
        extent: geo.extent,
        projection: geo.projection,
        georeferenced: geo.georeferenced,
        warning: geo.warning,
        width,
        height,
        resolution: geo.resolution,
        capturedAt: readCaptureDate(image),
    };
}

/* ------------------------------------------------------------------ *
 * Main entry
 * ------------------------------------------------------------------ */

export async function renderGeoTIFFPreview(
    file: File,
    onProgress?: (value: number) => void
): Promise<RasterPreview> {
    onProgress?.(5);

    const buffer = await file.arrayBuffer();

    onProgress?.(15);

    let tiff: GeoTIFF.GeoTIFF;

    try {
        tiff = await GeoTIFF.fromArrayBuffer(buffer);
    } catch {
        throw new Error(
            `${file.name} is not a readable TIFF. Export it as a GeoTIFF and try again.`
        );
    }

    const fullResImage = await tiff.getImage();

    const width = fullResImage.getWidth();
    const height = fullResImage.getHeight();

    onProgress?.(25);

    // Georeferencing always comes from IFD 0 — overviews often omit the tags
    const geo = readGeoreference(fullResImage, width, height);
    const capturedAt = readCaptureDate(fullResImage);

    const { previewWidth, previewHeight } = previewSize(width, height);

    const sourceImage = await pickPreviewImage(
        tiff,
        fullResImage,
        Math.max(previewWidth, previewHeight)
    );

    onProgress?.(35);

    const samplesPerPixel = sourceImage.getSamplesPerPixel();
    const nodata = readNodata(fullResImage);

    const raster = (await sourceImage.readRasters({
        interleave: true,
        width: previewWidth,
        height: previewHeight,
        resampleMethod: "bilinear",
    })) as unknown as ArrayLike<number>;

    onProgress?.(65);

    const dir = sourceImage.getFileDirectory() as Record<string, any> | undefined;
    const bitsPerSample = (dir?.BitsPerSample?.[0] as number) ?? 8;
    const sampleFormat = (dir?.SampleFormat?.[0] as number) ?? 1; // 3 = float
    const needsStretch = bitsPerSample > 8 || sampleFormat === 3;

    const colourBands = samplesPerPixel >= 3 ? 3 : 1;

    const stretches: Stretch[] = needsStretch
        ? Array.from({ length: colourBands }, (_unused, band) =>
            bandStretch(raster, samplesPerPixel, band, nodata)
        )
        : [];

    const toByte = (value: number, band: number) => {
        if (!needsStretch) return value;

        const { min, span } = stretches[band];

        return ((value - min) / span) * 255;
    };

    onProgress?.(75);

    const pixels = previewWidth * previewHeight;
    const rgba = new Uint8ClampedArray(pixels * 4);
    const alphaMax = Math.pow(2, bitsPerSample) - 1;

    for (let i = 0; i < pixels; i += 1) {
        const src = i * samplesPerPixel;
        const dst = i * 4;

        const first = raster[src];
        const isNodata = nodata !== undefined && first === nodata;

        if (samplesPerPixel >= 3) {
            rgba[dst] = toByte(first, 0);
            rgba[dst + 1] = toByte(raster[src + 1], 1);
            rgba[dst + 2] = toByte(raster[src + 2], 2);
            rgba[dst + 3] = isNodata
                ? 0
                : samplesPerPixel >= 4
                    ? (raster[src + 3] / alphaMax) * 255
                    : 255;
        } else {
            const grey = toByte(first, 0);

            rgba[dst] = grey;
            rgba[dst + 1] = grey;
            rgba[dst + 2] = grey;
            rgba[dst + 3] = isNodata ? 0 : 255;
        }
    }

    onProgress?.(88);

    const canvas = document.createElement("canvas");

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("This browser refused a 2D canvas, so no preview can be drawn.");
    }

    ctx.putImageData(new ImageData(rgba, previewWidth, previewHeight), 0, 0);

    onProgress?.(95);

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (!result) {
                reject(
                    new Error(
                        `The preview canvas (${previewWidth}×${previewHeight}) exceeded this browser's limit.`
                    )
                );

                return;
            }

            resolve(result);
        }, "image/png");
    });

    onProgress?.(100);

    return {
        // caller owns this URL — revoke it when the layer is removed
        imageUrl: URL.createObjectURL(blob),
        extent: geo.extent,
        projection: geo.projection,
        georeferenced: geo.georeferenced,
        warning: geo.warning,
        width,
        height,
        previewWidth,
        previewHeight,
        resolution: geo.resolution,
        capturedAt,
    };
}