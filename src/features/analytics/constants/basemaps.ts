/**
 * Basemap gallery — eight public tile services, no API keys required.
 *
 * Every entry is a plain XYZ raster service so switching is instantaneous:
 * we swap the single `basemap` source instead of loading a new vector style.
 */
import type { BasemapDef } from "../types/types";

const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const BASEMAPS: BasemapDef[] = [
    {
        id: "osm",
        name: "OpenStreetMap",
        provider: "OSM Standard",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTR,
        tone: "light",
    },
    {
        id: "esri-imagery",
        name: "Esri World Imagery",
        provider: "Esri / Maxar",
        tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        tone: "imagery",
    },
    {
        id: "carto-positron",
        name: "CARTO Positron",
        provider: "CARTO",
        tiles: [
            "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: `${OSM_ATTR}, © <a href="https://carto.com/attributions">CARTO</a>`,
        tone: "light",
    },
    {
        id: "carto-dark",
        name: "CARTO Dark Matter",
        provider: "CARTO",
        tiles: [
            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: `${OSM_ATTR}, © <a href="https://carto.com/attributions">CARTO</a>`,
        tone: "dark",
    },
    {
        id: "opentopo",
        name: "OpenTopoMap",
        provider: "OpenTopoMap",
        tiles: [
            "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
            "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
            "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: `${OSM_ATTR}, SRTM | map style © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
        tone: "terrain",
    },
    {
        id: "stadia-outdoors",
        name: "Stadia Outdoors",
        provider: "Stadia Maps",
        tiles: ["https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 20,
        attribution:
            '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
            OSM_ATTR,
        tone: "terrain",
        note: "Free on localhost. Register your domain with Stadia before deploying.",
    },
    {
        id: "osm-hot",
        name: "Humanitarian OSM",
        provider: "HOT / OSM France",
        tiles: [
            "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: `${OSM_ATTR}, tiles © <a href="https://www.hotosm.org/">HOT</a>`,
        tone: "light",
    },
    {
        id: "carto-voyager",
        name: "Voyager",
        provider: "CARTO",
        tiles: [
            "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: `${OSM_ATTR}, © <a href="https://carto.com/attributions">CARTO</a>`,
        tone: "light",
    },
];

export const DEFAULT_BASEMAP_ID = "esri-imagery";

export function getBasemap(id: string): BasemapDef {
    return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

/**
 * A single real tile used as the gallery thumbnail — no extra assets to ship
 * and it fails visibly if a provider goes away.
 */
export function basemapThumbnail(basemap: BasemapDef): string {
    return basemap.tiles[0]
        .replace("{z}", "4")
        .replace("{x}", "8")
        .replace("{y}", "5")
        .replace("{r}", "");
}

/** Free global terrain (Terrarium-encoded), used by the terrain panel. */
export const TERRAIN_SOURCE = {
    id: "terrain-dem",
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    encoding: "terrarium" as const,
    tileSize: 256,
    maxzoom: 14,
    attribution:
        'Elevation: <a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a> (SRTM, GMTED, NED)',
};

/** Free OpenMapTiles-schema vector tiles used for the 3D buildings toggle. */
export const BUILDINGS_SOURCE = {
    id: "openfreemap-planet",
    url: "https://tiles.openfreemap.org/planet",
    sourceLayer: "building",
    attribution: `${OSM_ATTR} | <a href="https://openfreemap.org/">OpenFreeMap</a>`,
};