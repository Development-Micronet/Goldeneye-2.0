import * as maplibregl from "maplibre-gl";
import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import { writeArrayBuffer } from "geotiff";

interface ExportAOIOptions {
    geojson: any;
    filename: string;
}

interface ExportResult {
    file: File;
    previewUrl: string;
    bbox: [number, number, number, number];
}

const ESRI_IMAGERY =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/*
 * Write a 4th alpha band so pixels outside the AOI are NoData rather than
 * black. Set to false if the analytics preview expects exactly 3 bands.
 */
const INCLUDE_ALPHA_BAND = true;

/** Offscreen render size, in CSS pixels, before devicePixelRatio scaling. */
const RENDER_SIZE = 1024;

/**
 * Triggers a browser download for a File or Blob.
 */
export const downloadFile = (file: Blob, filename: string): void => {
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        filename.endsWith(".tif") || filename.endsWith(".tiff")
            ? filename
            : `${filename}.tif`;

    link.style.display = "none";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    /*
     * Revoke on the next tick. Revoking synchronously can cancel the
     * download in Firefox and Safari before it starts.
     */
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
};

const getGeometryBBox = (geometry: Geometry): [number, number, number, number] => {
    const extent = geometry.getExtent();

    return [extent[0], extent[1], extent[2], extent[3]];
};

/**
 * Resolves once the map has settled AND every tile has finished loading.
 *
 * Checking isMoving() alone is not enough: after fitBounds with duration 0 the
 * map is already stationary while tiles are still in flight, so the capture
 * would run against a half-loaded basemap.
 */
const waitForMapIdle = (map: maplibregl.Map, timeoutMs = 20000): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!map.isMoving() && map.loaded() && map.areTilesLoaded()) {
            resolve();
            return;
        }

        const timer = setTimeout(() => {
            map.off("idle", onIdle);
            reject(new Error("Timed out waiting for imagery tiles to load."));
        }, timeoutMs);

        function onIdle() {
            clearTimeout(timer);
            resolve();
        }

        map.once("idle", onIdle);
    });
};

const createMapLibreMap = (container: HTMLDivElement): maplibregl.Map => {
    return new maplibregl.Map({
        container,

        style: {
            version: 8,

            sources: {
                "esri-imagery": {
                    type: "raster",

                    tiles: [ESRI_IMAGERY],

                    tileSize: 256,

                    attribution: "Tiles © Esri",
                },
            },

            layers: [
                {
                    id: "esri-imagery",

                    type: "raster",

                    source: "esri-imagery",

                    paint: {
                        "raster-opacity": 1,
                    },
                },
            ],
        },

        center: [78.9629, 20.5937],

        zoom: 4,

        preserveDrawingBuffer: true,

        attributionControl: false,

        interactive: false,
    });
};

const createAOIPath = (
    ctx: CanvasRenderingContext2D,
    geometry: Geometry,
    project: (coordinate: number[]) => { x: number; y: number },
    cropLeft: number,
    cropTop: number,
) => {
    const geometryType = geometry.getType();

    const traceRing = (ring: number[][]) => {
        ring.forEach((coordinate: number[], index: number) => {
            const point = project(coordinate);

            const x = point.x - cropLeft;

            const y = point.y - cropTop;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.closePath();
    };

    ctx.beginPath();

    if (geometryType === "Polygon") {
        (geometry as any).getCoordinates().forEach(traceRing);

        return;
    }

    if (geometryType === "MultiPolygon") {
        (geometry as any).getCoordinates().forEach((polygon: number[][][]) => {
            polygon.forEach(traceRing);
        });

        return;
    }

    throw new Error(`Unsupported AOI geometry: ${geometryType}`);
};

const createMaskedScreenshot = (
    map: maplibregl.Map,
    geometry: Geometry,
    bbox: [number, number, number, number],
): HTMLCanvasElement => {
    const sourceCanvas = map.getCanvas();

    /*
     * map.project() returns CSS pixels, but the WebGL buffer is sized at
     * devicePixelRatio. Without this scale the crop lands in the wrong place
     * and comes out at the wrong size on any HiDPI screen.
     */
    const rect = sourceCanvas.getBoundingClientRect();

    const scaleX = sourceCanvas.width / (rect.width || sourceCanvas.width);

    const scaleY = sourceCanvas.height / (rect.height || sourceCanvas.height);

    const project = (coordinate: number[]) => {
        const point = map.project([coordinate[0], coordinate[1]] as [number, number]);

        return {
            x: point.x * scaleX,
            y: point.y * scaleY,
        };
    };

    /*
     * Project AOI bbox into device pixel coordinates.
     */
    const topLeft = project([bbox[0], bbox[3]]);

    const bottomRight = project([bbox[2], bbox[1]]);

    const cropLeft = Math.max(0, Math.floor(topLeft.x));

    const cropTop = Math.max(0, Math.floor(topLeft.y));

    const cropRight = Math.min(sourceCanvas.width, Math.ceil(bottomRight.x));

    const cropBottom = Math.min(sourceCanvas.height, Math.ceil(bottomRight.y));

    const width = cropRight - cropLeft;

    const height = cropBottom - cropTop;

    if (width <= 0 || height <= 0) {
        throw new Error("AOI is outside the screenshot.");
    }

    const output = document.createElement("canvas");

    output.width = width;
    output.height = height;

    const ctx = output.getContext("2d", {
        willReadFrequently: true,
    });

    if (!ctx) {
        throw new Error("Unable to create canvas.");
    }

    /*
     * IMPORTANT:
     *
     * Do NOT fill the AOI.
     *
     * The AOI is only a clipping mask.
     */
    ctx.save();

    createAOIPath(ctx, geometry, project, cropLeft, cropTop);

    ctx.clip("evenodd");

    /*
     * Draw actual ESRI imagery.
     */
    ctx.drawImage(sourceCanvas, cropLeft, cropTop, width, height, 0, 0, width, height);

    ctx.restore();

    return output;
};

const canvasToGeoTIFF = (
    canvas: HTMLCanvasElement,
    bbox: [number, number, number, number],
): ArrayBuffer => {
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
    });

    if (!ctx) {
        throw new Error("Unable to read screenshot canvas.");
    }

    const { width, height } = canvas;

    if (!width || !height) {
        throw new Error(`Invalid canvas dimensions: ${width} x ${height}`);
    }

    const imageData = ctx.getImageData(0, 0, width, height);

    /*
     * GeoTIFF expects one flat interleaved array:
     *
     * R G B A | R G B A | ...
     *
     * NOT:
     *
     * [red[], green[], blue[]]
     */
    const samples = INCLUDE_ALPHA_BAND ? 4 : 3;

    const values = new Uint8Array(width * height * samples);

    for (let i = 0; i < width * height; i++) {
        const src = i * 4;
        const dst = i * samples;

        values[dst] = imageData.data[src];

        values[dst + 1] = imageData.data[src + 1];

        values[dst + 2] = imageData.data[src + 2];

        if (INCLUDE_ALPHA_BAND) {
            values[dst + 3] = imageData.data[src + 3];
        }
    }

    const pixelWidth = (bbox[2] - bbox[0]) / width;

    const pixelHeight = (bbox[3] - bbox[1]) / height;

    /*
     * IMPORTANT:
     *
     * GeoTIFF ModelPixelScale Y is positive,
     * while the image origin is top-left.
     *
     * ModelTiepoint points pixel (0,0)
     * to the geographic top-left.
     */
    const metadata = {
        width,

        height,

        SamplesPerPixel: samples,

        BitsPerSample: INCLUDE_ALPHA_BAND ? [8, 8, 8, 8] : [8, 8, 8],

        SampleFormat: INCLUDE_ALPHA_BAND ? [1, 1, 1, 1] : [1, 1, 1],

        PhotometricInterpretation: 2,

        PlanarConfiguration: 1,

        /*
         * 2 = unassociated alpha. Without this tag a 4-band file is read as
         * an unknown extra sample, which is what makes viewers render it
         * as a flat block of colour.
         */
        ...(INCLUDE_ALPHA_BAND ? { ExtraSamples: [2] } : {}),

        ModelPixelScale: [pixelWidth, pixelHeight, 0],

        ModelTiepoint: [0, 0, 0, bbox[0], bbox[3], 0],

        GeographicTypeGeoKey: 4326,

        GTModelTypeGeoKey: 2,

        GTRasterTypeGeoKey: 1,
    };

    return writeArrayBuffer(values, metadata as any) as ArrayBuffer;
};

export const exportAOIWithMapLibre = async ({
    geojson,
    filename,
}: ExportAOIOptions): Promise<ExportResult> => {
    const format = new GeoJSON();

    const feature = format.readFeature(geojson) as Feature<Geometry>;

    const geometry = feature.getGeometry();

    if (!geometry) {
        throw new Error("Selected AOI has no geometry.");
    }

    const bbox = getGeometryBBox(geometry);

    /*
     * Size the container to the AOI's aspect ratio so the shape fills the
     * frame. A square container wastes resolution on wide or tall AOIs.
     */
    const aspect = (bbox[2] - bbox[0]) / (bbox[3] - bbox[1]) || 1;

    const containerWidth = aspect >= 1 ? RENDER_SIZE : Math.round(RENDER_SIZE * aspect);

    const containerHeight = aspect >= 1 ? Math.round(RENDER_SIZE / aspect) : RENDER_SIZE;

    /*
     * Temporary MapLibre container.
     */
    const container = document.createElement("div");

    container.style.position = "fixed";

    container.style.left = "-10000px";

    container.style.top = "-10000px";

    container.style.width = `${containerWidth}px`;

    container.style.height = `${containerHeight}px`;

    container.style.pointerEvents = "none";

    document.body.appendChild(container);

    let map: maplibregl.Map | null = null;

    try {
        map = createMapLibreMap(container);

        await new Promise<void>((resolve, reject) => {
            map!.once("load", () => resolve());

            map!.once("error", (event) =>
                reject(event.error || new Error("MapLibre failed to load.")),
            );
        });

        /*
         * Navigate the temporary map
         * to the selected AOI.
         */
        map.fitBounds(
            [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]],
            ],
            {
                padding: 0,

                duration: 0,

                maxZoom: 19,
            },
        );

        await waitForMapIdle(map);

        /*
         * Make sure tiles have finished
         * rendering.
         */
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    resolve();
                });
            });
        });

        /*
         * Take screenshot and mask
         * it to the AOI.
         */
        const screenshot = createMaskedScreenshot(map, geometry, bbox);

        /*
         * Convert screenshot to GeoTIFF.
         */
        const arrayBuffer = canvasToGeoTIFF(screenshot, bbox);

        const file = new File([arrayBuffer], filename, {
            type: "image/tiff",
        });

        /*
         * Preview image.
         */
        const previewUrl = screenshot.toDataURL("image/png");

        return {
            file,
            previewUrl,
            bbox,
        };
    } finally {
        map?.remove();

        container.remove();
    }
};