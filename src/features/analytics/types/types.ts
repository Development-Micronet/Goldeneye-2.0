/**
 * Shared domain types for the EarthMap GIS viewer.
 *
 * The layer model is a discriminated union: every panel, form and the map
 * reconciler (lib/mapHelpers.ts) speak this same language, so adding a new
 * layer type means adding one variant + one branch in `buildSource`/`buildLayers`.
 */
import type {
    FilterSpecification,
    LngLatBoundsLike,
    StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";

/* ------------------------------------------------------------------ */
/* Basemaps                                                            */
/* ------------------------------------------------------------------ */
/**
 * REPLACE the existing `BasemapDef` interface in `types/types.ts` with this.
 * Everything else in that file stays as it is.
 *
 * The old shape required `tiles`, `tileSize` and `maxzoom` on every basemap and
 * had no idea vector basemaps existed. The Liberty entry in
 * `constants/basemaps.ts` supplies `styleUrl` / `type` / `projection` /
 * `digitalTwin` and no `tiles` at all, so the two files disagreed. Vite strips
 * types with esbuild and never type-checks, so this ran anyway — with
 * `basemap.tiles` undefined at runtime.
 */

/** Vector basemaps ship a whole style document; raster ones are XYZ tiles. */
export type BasemapType = "raster" | "vector";

export interface BasemapDef {
  id: string;
  name: string;
  /** Short provider label shown under the name in the gallery. */
  provider: string;

  /** Which of the two source shapes below applies. */
  type?: BasemapType;

  /**
   * XYZ tile templates (multiple entries = subdomain sharding).
   * Required for `type: "raster"`, absent for `type: "vector"`.
   */
  tiles?: string[];
  tileSize?: number;
  maxzoom?: number;

  /** Style document URL. Required for `type: "vector"`. */
  styleUrl?: string;

  attribution: string;

  /** Drives the sky/fog palette. `"3d"` is the pitched city basemap. */
  tone: "light" | "dark" | "imagery" | "terrain" | "3d";

  /**
   * Forced projection. Custom Three.js layers and fill-extrusion read best in
   * Mercator, so 3D basemaps pin themselves there.
   */
  projection?: ProjectionMode;

  /** Mounts the Three.js digital-twin scene when this basemap is active. */
  digitalTwin?: boolean;

  /** Optional note surfaced in the UI (e.g. key requirements). */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Optional: stricter variant                                          */
/* ------------------------------------------------------------------ */

/**
 * If you would rather have the compiler enforce "raster means tiles, vector
 * means styleUrl", use this discriminated union instead of the interface
 * above. It is stricter but forces a `basemap.type === "raster"` narrowing
 * everywhere `tiles` is read, so adopt it only if you want to do that pass.
 */
export type StrictBasemapDef =
  | (BasemapBase & {
      type: "raster";
      tiles: string[];
      tileSize: number;
      maxzoom: number;
      styleUrl?: never;
    })
  | (BasemapBase & {
      type: "vector";
      styleUrl: string;
      tiles?: never;
      tileSize?: never;
      maxzoom?: never;
    });

interface BasemapBase {
  id: string;
  name: string;
  provider: string;
  attribution: string;
  tone: "light" | "dark" | "imagery" | "terrain" | "3d";
  projection?: ProjectionMode;
  digitalTwin?: boolean;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

export type LayerKind =
    | "raster"
    | "wms"
    | "wmts"
    | "vector"
    | "geojson"
    | "image";

export interface LayerMetadata {
    description?: string;
    provider?: string;
    attribution?: string;
    license?: string;
    homepage?: string;
    tags?: string[];
    /** Free-form extras rendered as a key/value table. */
    extra?: Record<string, string>;
}

export interface LayerBase {
    id: string;
    name: string;
    kind: LayerKind;
    visible: boolean;
    /** 0..1 — mapped to the right paint property for each layer type. */
    opacity: number;
    /** Bumped whenever the *structure* (not just visibility/opacity) changes. */
    rev: number;
    metadata?: LayerMetadata;
    /** [west, south, east, north] — enables "zoom to layer". */
    bounds?: [number, number, number, number];
    minzoom?: number;
    maxzoom?: number;
}

/** Plain XYZ / TMS raster tiles. */
export interface RasterLayerDef extends LayerBase {
    kind: "raster";
    tiles: string[];
    tileSize: number;
    scheme?: "xyz" | "tms";
}

/** OGC WMS via GetMap requests wrapped in a raster source. */
export interface WMSLayerDef extends LayerBase {
    kind: "wms";
    url: string;
    layers: string;
    styles?: string;
    format: string;
    transparent: boolean;
    version: "1.1.1" | "1.3.0";
    tileSize: number;
}

/** OGC WMTS — either a RESTful template or KVP GetTile. */
export interface WMTSLayerDef extends LayerBase {
    kind: "wmts";
    /** Ready-made template containing {z}/{x}/{y}. */
    template?: string;
    /** KVP endpoint parts (used when `template` is absent). */
    url?: string;
    layer?: string;
    tileMatrixSet?: string;
    style?: string;
    format?: string;
    tileSize: number;
}

export type VectorSubLayerType =
    | "fill"
    | "line"
    | "symbol"
    | "circle"
    | "fill-extrusion";

export interface VectorSubLayer {
    id: string;
    type: VectorSubLayerType;
    sourceLayer: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    filter?: FilterSpecification;
}

/** Mapbox Vector Tiles (MVT) from a TileJSON url or raw tile template. */
export interface VectorLayerDef extends LayerBase {
    kind: "vector";
    /** TileJSON endpoint (mutually exclusive with `tiles`). */
    url?: string;
    tiles?: string[];
    styleLayers: VectorSubLayer[];
}

export interface GeoJSONStyle {
    pointColor: string;
    pointRadius: number;
    lineColor: string;
    lineWidth: number;
    fillColor: string;
    fillOpacity: number;
    /** Property name rendered as a label, if any. */
    labelField?: string;
}

export interface GeoJSONLayerDef extends LayerBase {
    kind: "geojson";
    data: FeatureCollection;
    /** Kept for the metadata panel / re-fetch. */
    sourceUrl?: string;
    style: GeoJSONStyle;
    cluster: boolean;
}

/** Static image pinned to four corner coordinates. */
export interface ImageLayerDef extends LayerBase {
    kind: "image";
    url: string;
    /** TL, TR, BR, BL. */
    coordinates: [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
    ];
}

export type LayerDef =
    | RasterLayerDef
    | WMSLayerDef
    | WMTSLayerDef
    | VectorLayerDef
    | GeoJSONLayerDef
    | ImageLayerDef;

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export interface CatalogEntry {
    id: string;
    name: string;
    group: string;
    kind: LayerKind;
    blurb: string;
    /** Prompts for an API key before the factory runs. */
    requiresKey?: boolean;
    keyLabel?: string;
    /** Runs an async fetch (Overpass, remote GeoJSON, …). */
    async?: boolean;
    build: (opts: CatalogBuildOptions) => LayerDef | Promise<LayerDef>;
}

export interface CatalogBuildOptions {
    apiKey?: string;
    /** Current viewport — used by bbox-driven services such as Overpass. */
    bounds?: [number, number, number, number];
}

/* ------------------------------------------------------------------ */
/* Drawing / measuring                                                 */
/* ------------------------------------------------------------------ */

export type DrawMode =
    | "idle"
    | "select"
    | "point"
    | "line"
    | "polygon"
    | "rectangle"
    | "circle"
    | "measure-distance"
    | "measure-area"
    | "measure-bearing";

export interface DrawFeatureProps {
    /** Shape family, used for editing rules and label formatting. */
    shape: "point" | "line" | "polygon" | "rectangle" | "circle";
    /** True for ephemeral measurement geometry (styled differently). */
    measure?: boolean;
    label?: string;
    radius?: number;
    center?: [number, number];
    createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export type ProjectionMode = "globe" | "mercator";

export interface MapStatus {
    cursor: { lng: number; lat: number } | null;
    center: { lng: number; lat: number };
    zoom: number;
    bearing: number;
    pitch: number;
    /** Ground resolution at the map centre, in metres per pixel. */
    resolution: number;
}

export interface SearchResult {
    id: string;
    label: string;
    category: string;
    lng: number;
    lat: number;
    bounds?: LngLatBoundsLike;
}

export type StyleFactory = (projection: ProjectionMode) => StyleSpecification;