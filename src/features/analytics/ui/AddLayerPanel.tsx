/**
 * "Add data" forms — one per supported service type. Each form produces a
 * fully-formed LayerDef; nothing here talks to MapLibre directly.
 */
import { useRef, useState } from "react";
import type {
    GeoJSONLayerDef,
    ImageLayerDef,
    LayerDef,
    VectorSubLayer,
    VectorSubLayerType,
} from "../types/types";
import { DEFAULT_GEOJSON_STYLE } from "../constants/catalog";
import { fetchGeoJSON, guessLabelField, readGeoJSONFile } from "../lib/data";
import { geojsonBounds } from "../lib/geo";
import { uid } from "../lib/mapHelpers";

type FormKind = "xyz" | "vector" | "wms" | "wmts" | "geojson" | "image";

const FORM_TABS: { id: FormKind; label: string }[] = [
    { id: "xyz", label: "XYZ" },
    { id: "vector", label: "MVT" },
    { id: "wms", label: "WMS" },
    { id: "wmts", label: "WMTS" },
    { id: "geojson", label: "GeoJSON" },
    { id: "image", label: "Image" },
];

export interface AddLayerPanelProps {
    onAdd: (layer: LayerDef) => void;
    onError: (message: string) => void;
    onNotice: (message: string) => void;
}

const shell = (name: string, kind: LayerDef["kind"]) =>
    ({ id: uid(kind), name, kind, visible: true, opacity: 1, rev: 1 }) as const;

export function AddLayerPanel({ onAdd, onError, onNotice }: AddLayerPanelProps) {
    const [tab, setTab] = useState<FormKind>("xyz");

    return (
        <section className="em-section">
            <h2>Add data</h2>
            <div className="em-tabs" style={{ marginBottom: 12, border: 0 }}>
                {FORM_TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        onClick={() => setTab(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "xyz" && <XyzForm onAdd={onAdd} />}
            {tab === "vector" && <VectorForm onAdd={onAdd} />}
            {tab === "wms" && <WmsForm onAdd={onAdd} />}
            {tab === "wmts" && <WmtsForm onAdd={onAdd} />}
            {tab === "geojson" && <GeoJSONForm onAdd={onAdd} onError={onError} onNotice={onNotice} />}
            {tab === "image" && <ImageForm onAdd={onAdd} onError={onError} />}
        </section>
    );
}

/* ------------------------------------------------------------------ XYZ */

function XyzForm({ onAdd }: { onAdd: (layer: LayerDef) => void }) {
    const [name, setName] = useState("Custom raster");
    const [url, setUrl] = useState("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    const [tileSize, setTileSize] = useState(256);
    const [maxzoom, setMaxzoom] = useState(19);
    const [tms, setTms] = useState(false);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onAdd({
                    ...shell(name || "Custom raster", "raster"),
                    kind: "raster",
                    tiles: [url.trim()],
                    tileSize,
                    maxzoom,
                    scheme: tms ? "tms" : "xyz",
                    metadata: { provider: "Custom", attribution: new URL(url).hostname },
                });
            }}
        >
            <label className="em-field">
                <span>Name</span>
                <input className="em-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="em-field">
                <span>Tile URL template</span>
                <input
                    className="em-input"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…/{z}/{x}/{y}.png"
                />
            </label>
            <div className="em-row">
                <label className="em-field">
                    <span>Tile size</span>
                    <select
                        className="em-select"
                        value={tileSize}
                        onChange={(e) => setTileSize(Number(e.target.value))}
                    >
                        <option value={256}>256</option>
                        <option value={512}>512</option>
                    </select>
                </label>
                <label className="em-field">
                    <span>Max zoom</span>
                    <input
                        className="em-input"
                        type="number"
                        min={1}
                        max={24}
                        value={maxzoom}
                        onChange={(e) => setMaxzoom(Number(e.target.value))}
                    />
                </label>
            </div>
            <label className="em-check" style={{ marginBottom: 10 }}>
                <input type="checkbox" checked={tms} onChange={(e) => setTms(e.target.checked)} />
                TMS scheme (flipped Y)
            </label>
            <button className="em-btn em-btn--wide" data-active type="submit">
                Add raster layer
            </button>
        </form>
    );
}

/* --------------------------------------------------------------- vector */

const VECTOR_TYPES: VectorSubLayerType[] = ["fill", "line", "symbol", "circle", "fill-extrusion"];

function VectorForm({ onAdd }: { onAdd: (layer: LayerDef) => void }) {
    const [name, setName] = useState("Custom vector tiles");
    const [url, setUrl] = useState("https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf");
    const [sourceLayer, setSourceLayer] = useState("countries");
    const [type, setType] = useState<VectorSubLayerType>("line");
    const [colour, setColour] = useState("#38bdf8");
    const [maxzoom, setMaxzoom] = useState(14);

    /** Paint block appropriate to the chosen MapLibre layer type. */
    const paintFor = (kind: VectorSubLayerType): VectorSubLayer => {
        switch (kind) {
            case "fill":
                return { id: "fill", type: "fill", sourceLayer, paint: { "fill-color": colour, "fill-opacity": 0.35 } };
            case "circle":
                return {
                    id: "circle",
                    type: "circle",
                    sourceLayer,
                    paint: { "circle-color": colour, "circle-radius": 4, "circle-stroke-width": 1, "circle-stroke-color": "rgba(0,0,0,.5)" },
                };
            case "symbol":
                return {
                    id: "symbol",
                    type: "symbol",
                    sourceLayer,
                    layout: { "text-field": ["coalesce", ["get", "name"], ""], "text-font": ["Open Sans Regular", "Arial Unicode MS"], "text-size": 11 },
                    paint: { "text-color": colour, "text-halo-color": "rgba(5,10,16,.85)", "text-halo-width": 1.2 },
                };
            case "fill-extrusion":
                return {
                    id: "extrusion",
                    type: "fill-extrusion",
                    sourceLayer,
                    paint: {
                        "fill-extrusion-color": colour,
                        "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
                        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                        "fill-extrusion-opacity": 0.85,
                    },
                };
            default:
                return { id: "line", type: "line", sourceLayer, paint: { "line-color": colour, "line-width": 1.4 } };
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                const isTileJson = !url.includes("{z}");
                onAdd({
                    ...shell(name || "Vector tiles", "vector"),
                    kind: "vector",
                    url: isTileJson ? url.trim() : undefined,
                    tiles: isTileJson ? undefined : [url.trim()],
                    maxzoom: isTileJson ? undefined : maxzoom,
                    styleLayers: [paintFor(type)],
                    metadata: { provider: "Custom", extra: { "Source layer": sourceLayer, Style: type } },
                });
            }}
        >
            <label className="em-field">
                <span>Name</span>
                <input className="em-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="em-field">
                <span>Tile template or TileJSON</span>
                <input className="em-input" required value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <div className="em-row">
                <label className="em-field">
                    <span>Source layer</span>
                    <input
                        className="em-input"
                        required
                        value={sourceLayer}
                        onChange={(e) => setSourceLayer(e.target.value)}
                    />
                </label>
                <label className="em-field">
                    <span>Style layer</span>
                    <select
                        className="em-select"
                        value={type}
                        onChange={(e) => setType(e.target.value as VectorSubLayerType)}
                    >
                        {VECTOR_TYPES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="em-row">
                <label className="em-field">
                    <span>Colour</span>
                    <input
                        className="em-input"
                        type="color"
                        value={colour}
                        onChange={(e) => setColour(e.target.value)}
                    />
                </label>
                <label className="em-field">
                    <span>Max zoom</span>
                    <input
                        className="em-input"
                        type="number"
                        min={1}
                        max={22}
                        value={maxzoom}
                        onChange={(e) => setMaxzoom(Number(e.target.value))}
                    />
                </label>
            </div>
            <button className="em-btn em-btn--wide" data-active type="submit">
                Add vector layer
            </button>
            <p className="em-hint">
                Tile templates need {"{z}/{x}/{y}"}. A URL without placeholders is treated
                as TileJSON.
            </p>
        </form>
    );
}

/* ------------------------------------------------------------------ WMS */

function WmsForm({ onAdd }: { onAdd: (layer: LayerDef) => void }) {
    const [state, setState] = useState({
        name: "WMS layer",
        url: "https://ows.terrestris.de/osm/service",
        layers: "OSM-WMS",
        format: "image/png",
        version: "1.3.0" as "1.1.1" | "1.3.0",
        styles: "",
        transparent: true,
        tileSize: 256,
    });
    const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) =>
        setState((prev) => ({ ...prev, [key]: value }));

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onAdd({
                    ...shell(state.name || state.layers, "wms"),
                    kind: "wms",
                    url: state.url.trim(),
                    layers: state.layers.trim(),
                    styles: state.styles,
                    format: state.format,
                    transparent: state.transparent,
                    version: state.version,
                    tileSize: state.tileSize,
                    metadata: {
                        provider: new URL(state.url).hostname,
                        extra: { Service: `WMS ${state.version}`, Layers: state.layers },
                    },
                });
            }}
        >
            <label className="em-field">
                <span>Name</span>
                <input className="em-input" value={state.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="em-field">
                <span>Service URL</span>
                <input
                    className="em-input"
                    required
                    value={state.url}
                    onChange={(e) => set("url", e.target.value)}
                    placeholder="https://host/geoserver/wms"
                />
            </label>
            <label className="em-field">
                <span>Layer name(s)</span>
                <input
                    className="em-input"
                    required
                    value={state.layers}
                    onChange={(e) => set("layers", e.target.value)}
                />
            </label>
            <div className="em-row">
                <label className="em-field">
                    <span>Format</span>
                    <select
                        className="em-select"
                        value={state.format}
                        onChange={(e) => set("format", e.target.value)}
                    >
                        <option value="image/png">image/png</option>
                        <option value="image/jpeg">image/jpeg</option>
                        <option value="image/webp">image/webp</option>
                    </select>
                </label>
                <label className="em-field">
                    <span>Version</span>
                    <select
                        className="em-select"
                        value={state.version}
                        onChange={(e) => set("version", e.target.value as "1.1.1" | "1.3.0")}
                    >
                        <option value="1.3.0">1.3.0</option>
                        <option value="1.1.1">1.1.1</option>
                    </select>
                </label>
            </div>
            <label className="em-field">
                <span>Styles (optional)</span>
                <input className="em-input" value={state.styles} onChange={(e) => set("styles", e.target.value)} />
            </label>
            <label className="em-check" style={{ marginBottom: 10 }}>
                <input
                    type="checkbox"
                    checked={state.transparent}
                    onChange={(e) => set("transparent", e.target.checked)}
                />
                Transparent background
            </label>
            <button className="em-btn em-btn--wide" data-active type="submit">
                Add WMS layer
            </button>
            <p className="em-hint">
                Requests are tiled in EPSG:3857. The service must send CORS headers.
            </p>
        </form>
    );
}

/* ----------------------------------------------------------------- WMTS */

function WmtsForm({ onAdd }: { onAdd: (layer: LayerDef) => void }) {
    const [mode, setMode] = useState<"rest" | "kvp">("rest");
    const [name, setName] = useState("WMTS layer");
    const [template, setTemplate] = useState(
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    );
    const [url, setUrl] = useState("https://host/wmts");
    const [layer, setLayer] = useState("");
    const [matrixSet, setMatrixSet] = useState("GoogleMapsCompatible");
    const [format, setFormat] = useState("image/png");

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onAdd({
                    ...shell(name || layer || "WMTS layer", "wmts"),
                    kind: "wmts",
                    template: mode === "rest" ? template.trim() : undefined,
                    url: mode === "kvp" ? url.trim() : undefined,
                    layer,
                    tileMatrixSet: matrixSet,
                    format,
                    tileSize: 256,
                    metadata: { provider: "WMTS", extra: { "Matrix set": matrixSet } },
                });
            }}
        >
            <label className="em-field">
                <span>Name</span>
                <input className="em-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="em-field">
                <span>Request encoding</span>
                <select
                    className="em-select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "rest" | "kvp")}
                >
                    <option value="rest">RESTful template</option>
                    <option value="kvp">Key/value GetTile</option>
                </select>
            </label>

            {mode === "rest" ? (
                <label className="em-field">
                    <span>Template</span>
                    <input
                        className="em-input"
                        required
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    />
                </label>
            ) : (
                <>
                    <label className="em-field">
                        <span>Endpoint</span>
                        <input className="em-input" required value={url} onChange={(e) => setUrl(e.target.value)} />
                    </label>
                    <div className="em-row">
                        <label className="em-field">
                            <span>Layer</span>
                            <input
                                className="em-input"
                                required
                                value={layer}
                                onChange={(e) => setLayer(e.target.value)}
                            />
                        </label>
                        <label className="em-field">
                            <span>Matrix set</span>
                            <input
                                className="em-input"
                                value={matrixSet}
                                onChange={(e) => setMatrixSet(e.target.value)}
                            />
                        </label>
                    </div>
                    <label className="em-field">
                        <span>Format</span>
                        <input className="em-input" value={format} onChange={(e) => setFormat(e.target.value)} />
                    </label>
                </>
            )}

            <button className="em-btn em-btn--wide" data-active type="submit">
                Add WMTS layer
            </button>
            <p className="em-hint">
                Only Web Mercator matrix sets (GoogleMapsCompatible) render correctly.
            </p>
        </form>
    );
}

/* -------------------------------------------------------------- GeoJSON */

function GeoJSONForm({
    onAdd,
    onError,
    onNotice,
}: {
    onAdd: (layer: LayerDef) => void;
    onError: (message: string) => void;
    onNotice: (message: string) => void;
}) {
    const [url, setUrl] = useState(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
    );
    const [cluster, setCluster] = useState(false);
    const [style, setStyle] = useState(DEFAULT_GEOJSON_STYLE);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement | null>(null);

    const build = (data: GeoJSONLayerDef["data"], name: string, sourceUrl?: string) => {
        const bounds = geojsonBounds(data);
        onAdd({
            ...shell(name, "geojson"),
            kind: "geojson",
            data,
            sourceUrl,
            cluster,
            style: { ...style, labelField: style.labelField ?? guessLabelField(data) },
            bounds: bounds ?? undefined,
            metadata: {
                provider: sourceUrl ? new URL(sourceUrl).hostname : "Local file",
                extra: { Features: String(data.features.length) },
            },
        });
    };

    return (
        <div>
            <label className="em-field">
                <span>Remote URL</span>
                <input className="em-input" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>

            <div className="em-row" style={{ marginBottom: 10 }}>
                <button
                    type="button"
                    className="em-btn"
                    data-active
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            const data = await fetchGeoJSON(url.trim());
                            build(data, new URL(url).pathname.split("/").pop() ?? "Remote GeoJSON", url.trim());
                        } catch (error) {
                            onError(`GeoJSON: ${(error as Error).message}`);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {busy ? "Fetching…" : "Fetch URL"}
                </button>
                <button type="button" className="em-btn" onClick={() => fileInput.current?.click()}>
                    Upload file
                </button>
            </div>

            <input
                ref={fileInput}
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                hidden
                onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                        build(await readGeoJSONFile(file), file.name);
                        onNotice(`${file.name} added.`);
                    } catch (error) {
                        onError((error as Error).message);
                    } finally {
                        event.target.value = "";
                    }
                }}
            />

            <StyleEditor style={style} onChange={setStyle} />

            <label className="em-check" style={{ marginBottom: 8 }}>
                <input type="checkbox" checked={cluster} onChange={(e) => setCluster(e.target.checked)} />
                Cluster points
            </label>
            <p className="em-hint">You can also drag a .geojson file straight onto the map.</p>
        </div>
    );
}

function StyleEditor({
    style,
    onChange,
}: {
    style: typeof DEFAULT_GEOJSON_STYLE;
    onChange: (next: typeof DEFAULT_GEOJSON_STYLE) => void;
}) {
    const set = <K extends keyof typeof style>(key: K, value: (typeof style)[K]) =>
        onChange({ ...style, [key]: value });

    return (
        <div className="em-row" style={{ marginBottom: 8 }}>
            <label className="em-field">
                <span>Point</span>
                <input
                    className="em-input"
                    type="color"
                    value={style.pointColor}
                    onChange={(e) => set("pointColor", e.target.value)}
                />
            </label>
            <label className="em-field">
                <span>Line</span>
                <input
                    className="em-input"
                    type="color"
                    value={style.lineColor}
                    onChange={(e) => set("lineColor", e.target.value)}
                />
            </label>
            <label className="em-field">
                <span>Fill</span>
                <input
                    className="em-input"
                    type="color"
                    value={style.fillColor}
                    onChange={(e) => set("fillColor", e.target.value)}
                />
            </label>
        </div>
    );
}

/* ---------------------------------------------------------------- image */

function ImageForm({
    onAdd,
    onError,
}: {
    onAdd: (layer: LayerDef) => void;
    onError: (message: string) => void;
}) {
    const [name, setName] = useState("Image overlay");
    const [url, setUrl] = useState("https://maplibre.org/maplibre-gl-js/docs/assets/radar.gif");
    const [box, setBox] = useState("-80.425, 37.936, -71.516, 46.437");

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                const parts = box.split(",").map((value) => Number(value.trim()));
                if (parts.length !== 4 || parts.some(Number.isNaN)) {
                    onError("Extent needs four numbers: west, south, east, north.");
                    return;
                }
                const [w, s, e, n] = parts as [number, number, number, number];
                const layer: ImageLayerDef = {
                    ...shell(name || "Image overlay", "image"),
                    kind: "image",
                    url: url.trim(),
                    coordinates: [
                        [w, n],
                        [e, n],
                        [e, s],
                        [w, s],
                    ],
                    bounds: [w, s, e, n],
                    metadata: { provider: "Custom image", extra: { Extent: box } },
                };
                onAdd(layer);
            }}
        >
            <label className="em-field">
                <span>Name</span>
                <input className="em-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="em-field">
                <span>Image URL</span>
                <input className="em-input" required value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="em-field">
                <span>Extent — west, south, east, north</span>
                <input className="em-input" required value={box} onChange={(e) => setBox(e.target.value)} />
            </label>
            <button className="em-btn em-btn--wide" data-active type="submit">
                Add image overlay
            </button>
        </form>
    );
}