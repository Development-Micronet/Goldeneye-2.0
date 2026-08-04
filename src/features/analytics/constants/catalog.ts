/**
 * One-click catalog of public GIS services.
 *
 * Each entry is a factory so date-driven services (NASA GIBS) and
 * viewport-driven services (Overpass) resolve at the moment they are added.
 */
import type { CatalogEntry, GeoJSONStyle, LayerDef } from "../types/types";
import { uid } from "../lib/mapHelpers";
import { daysAgoISO, fetchGeoJSON, guessLabelField, runOverpassQuery } from "../lib/data";

export const DEFAULT_GEOJSON_STYLE: GeoJSONStyle = {
    pointColor: "#2dd4bf",
    pointRadius: 5,
    lineColor: "#38bdf8",
    lineWidth: 1.6,
    fillColor: "#38bdf8",
    fillOpacity: 0.22,
};

const OSM_ATTR = '© OpenStreetMap contributors';

/** Shared defaults so factories only declare what makes them different. */
function base(name: string, kind: LayerDef["kind"]) {
    return { id: uid(kind), name, kind, visible: true, opacity: 1, rev: 1 } as const;
}

export const CATALOG: CatalogEntry[] = [
    /* ---------------------------------------------------------------- */
    /* Imagery                                                           */
    /* ---------------------------------------------------------------- */
    {
        id: "esri-satellite",
        name: "Esri World Imagery",
        group: "Imagery",
        kind: "raster",
        blurb: "Global high-resolution satellite and aerial mosaic.",
        build: () => ({
            ...base("Esri World Imagery", "raster"),
            kind: "raster",
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
            metadata: {
                provider: "Esri",
                attribution: "Esri, Maxar, Earthstar Geographics",
                license: "Esri terms of use",
                homepage: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
                tags: ["satellite", "imagery"],
            },
        }),
    },
    {
        id: "sentinel2-cloudless",
        name: "Sentinel-2 cloudless",
        group: "Imagery",
        kind: "wmts",
        blurb: "Cloud-free Sentinel-2 mosaic (EOX, CC BY 4.0).",
        build: () => ({
            ...base("Sentinel-2 cloudless 2020", "wmts"),
            kind: "wmts",
            template:
                "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
            tileSize: 256,
            maxzoom: 14,
            metadata: {
                provider: "EOX IT Services",
                attribution:
                    'Sentinel-2 cloudless 2020 by <a href="https://s2maps.eu">EOX</a> (contains modified Copernicus data)',
                license: "CC BY-NC-SA 4.0",
                homepage: "https://s2maps.eu",
                tags: ["sentinel", "copernicus", "wmts"],
            },
        }),
    },
    {
        id: "gibs-truecolor",
        name: "NASA GIBS — MODIS True Colour",
        group: "Earth observation",
        kind: "wmts",
        blurb: "Yesterday's global MODIS Terra corrected reflectance.",
        build: () => {
            const date = daysAgoISO(2);
            return {
                ...base(`NASA GIBS True Colour (${date})`, "wmts"),
                kind: "wmts",
                template:
                    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
                tileSize: 256,
                maxzoom: 9,
                metadata: {
                    provider: "NASA EOSDIS GIBS",
                    attribution: "Imagery courtesy NASA EOSDIS GIBS / Worldview",
                    license: "Public domain",
                    homepage: "https://worldview.earthdata.nasa.gov/",
                    extra: { Date: date, "Matrix set": "GoogleMapsCompatible_Level9" },
                    tags: ["nasa", "modis", "daily"],
                },
            };
        },
    },
    {
        id: "gibs-citylights",
        name: "NASA GIBS — Night Lights",
        group: "Earth observation",
        kind: "wmts",
        blurb: "VIIRS Earth at Night 2012 composite.",
        build: () => ({
            ...base("NASA Earth at Night", "wmts"),
            kind: "wmts",
            template:
                "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
            tileSize: 256,
            maxzoom: 8,
            metadata: {
                provider: "NASA EOSDIS GIBS",
                attribution: "NASA Earth Observatory / Suomi NPP VIIRS",
                license: "Public domain",
                tags: ["nasa", "viirs", "night"],
            },
        }),
    },

    /* ---------------------------------------------------------------- */
    /* Topographic + reference                                           */
    /* ---------------------------------------------------------------- */
    {
        id: "osm-standard",
        name: "OpenStreetMap Standard",
        group: "Reference",
        kind: "raster",
        blurb: "The classic OSM carto raster tiles.",
        build: () => ({
            ...base("OpenStreetMap", "raster"),
            kind: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            metadata: {
                provider: "OpenStreetMap Foundation",
                attribution: OSM_ATTR,
                license: "ODbL",
                homepage: "https://www.openstreetmap.org",
                tags: ["osm", "reference"],
            },
        }),
    },
    {
        id: "usgs-imagery-topo",
        name: "USGS Imagery Topo",
        group: "Reference",
        kind: "raster",
        blurb: "US National Map imagery with topographic overlay.",
        build: () => ({
            ...base("USGS Imagery Topo", "raster"),
            kind: "raster",
            tiles: [
                "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 16,
            bounds: [-179, 17, -65, 72],
            metadata: {
                provider: "U.S. Geological Survey",
                attribution: "USGS The National Map",
                license: "Public domain",
                homepage: "https://basemap.nationalmap.gov/",
                tags: ["usgs", "usa", "topo"],
            },
        }),
    },
    {
        id: "terrestris-osm-wms",
        name: "Terrestris OSM (WMS)",
        group: "OGC services",
        kind: "wms",
        blurb: "Well-known open WMS endpoint — handy for testing WMS support.",
        build: () => ({
            ...base("Terrestris OSM WMS", "wms"),
            kind: "wms",
            url: "https://ows.terrestris.de/osm/service",
            layers: "OSM-WMS",
            format: "image/png",
            transparent: true,
            version: "1.3.0",
            tileSize: 256,
            metadata: {
                provider: "terrestris GmbH",
                attribution: OSM_ATTR,
                license: "ODbL",
                homepage: "https://ows.terrestris.de/",
                extra: { Service: "WMS 1.3.0", Layer: "OSM-WMS" },
                tags: ["wms", "ogc"],
            },
        }),
    },

    /* ---------------------------------------------------------------- */
    /* Vector tiles                                                      */
    /* ---------------------------------------------------------------- */
    {
        id: "maplibre-demotiles",
        name: "MapLibre demo vector tiles",
        group: "Vector tiles",
        kind: "vector",
        blurb: "Country polygons and boundaries served as MVT.",
        build: () => ({
            ...base("MapLibre demo tiles", "vector"),
            kind: "vector",
            url: "https://demotiles.maplibre.org/tiles/tiles.json",
            styleLayers: [
                {
                    id: "countries-fill",
                    type: "fill",
                    sourceLayer: "countries",
                    paint: { "fill-color": "#38bdf8", "fill-opacity": 0.12 },
                },
                {
                    id: "countries-line",
                    type: "line",
                    sourceLayer: "countries",
                    paint: { "line-color": "#7dd3fc", "line-width": 0.8 },
                },
                {
                    id: "countries-label",
                    type: "symbol",
                    sourceLayer: "centroids",
                    layout: {
                        "text-field": ["get", "NAME"],
                        "text-font": ["Open Sans Regular", "Arial Unicode MS"],
                        "text-size": 11,
                    },
                    paint: {
                        "text-color": "#e2f3ff",
                        "text-halo-color": "rgba(4,10,16,0.85)",
                        "text-halo-width": 1.2,
                    },
                },
            ],
            metadata: {
                provider: "MapLibre",
                attribution: '© <a href="https://www.maplibre.org/">MapLibre</a>',
                license: "BSD-3-Clause",
                homepage: "https://demotiles.maplibre.org/",
                extra: { "Source layers": "countries, centroids, geolines" },
                tags: ["mvt", "demo"],
            },
        }),
    },
    {
        id: "openfreemap-buildings",
        name: "OpenFreeMap buildings (3D)",
        group: "Vector tiles",
        kind: "vector",
        blurb: "OpenMapTiles-schema planet tiles extruded by building height.",
        build: () => ({
            ...base("Buildings 3D", "vector"),
            kind: "vector",
            url: "https://tiles.openfreemap.org/planet",
            minzoom: 13,
            styleLayers: [
                {
                    id: "extrusion",
                    type: "fill-extrusion",
                    sourceLayer: "building",
                    paint: {
                        "fill-extrusion-color": [
                            "interpolate",
                            ["linear"],
                            ["coalesce", ["get", "render_height"], 5],
                            0, "#334155",
                            40, "#64748b",
                            120, "#cbd5f5",
                        ],
                        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 5],
                        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                        "fill-extrusion-opacity": 0.9,
                    },
                },
            ],
            metadata: {
                provider: "OpenFreeMap",
                attribution: `${OSM_ATTR} | OpenFreeMap`,
                license: "ODbL",
                homepage: "https://openfreemap.org/",
                extra: { Schema: "OpenMapTiles", "Source layer": "building" },
                tags: ["mvt", "3d", "buildings"],
            },
        }),
    },

    /* ---------------------------------------------------------------- */
    /* GeoJSON                                                           */
    /* ---------------------------------------------------------------- */
    {
        id: "usgs-quakes",
        name: "USGS earthquakes (24 h)",
        group: "GeoJSON",
        kind: "geojson",
        blurb: "Live seismic feed, added with clustering enabled.",
        async: true,
        build: async () => {
            const data = await fetchGeoJSON(
                "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
            );
            return {
                ...base("Earthquakes — past 24 h", "geojson"),
                kind: "geojson",
                data,
                sourceUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
                cluster: true,
                style: { ...DEFAULT_GEOJSON_STYLE, pointColor: "#f97316", pointRadius: 6, labelField: "mag" },
                metadata: {
                    provider: "U.S. Geological Survey",
                    attribution: "USGS Earthquake Hazards Program",
                    license: "Public domain",
                    homepage: "https://earthquake.usgs.gov/earthquakes/map/",
                    extra: { Features: String(data.features.length), Updated: new Date().toISOString() },
                    tags: ["live", "points", "clustered"],
                },
            };
        },
    },
    {
        id: "natural-earth-countries",
        name: "Natural Earth countries",
        group: "GeoJSON",
        kind: "geojson",
        blurb: "1:110m admin-0 boundaries, public domain.",
        async: true,
        build: async () => {
            const url =
                "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
            const data = await fetchGeoJSON(url);
            return {
                ...base("Natural Earth — countries", "geojson"),
                kind: "geojson",
                data,
                sourceUrl: url,
                cluster: false,
                style: {
                    ...DEFAULT_GEOJSON_STYLE,
                    fillColor: "#22d3ee",
                    fillOpacity: 0.1,
                    lineColor: "#67e8f9",
                    labelField: guessLabelField(data),
                },
                metadata: {
                    provider: "Natural Earth",
                    attribution: "Made with Natural Earth",
                    license: "Public domain",
                    homepage: "https://www.naturalearthdata.com/",
                    extra: { Scale: "1:110m", Features: String(data.features.length) },
                    tags: ["boundaries", "polygons"],
                },
            };
        },
    },
    {
        id: "overpass-cafes",
        name: "Overpass — cafés in view",
        group: "GeoJSON",
        kind: "geojson",
        blurb: "Live OSM query for amenity=cafe inside the current viewport.",
        async: true,
        build: async ({ bounds }) => {
            if (!bounds) throw new Error("Map bounds unavailable.");
            const query = `[out:json][timeout:25];node["amenity"="cafe"]({{bbox}});out body 500;`;
            const data = await runOverpassQuery(query, bounds);
            return {
                ...base("OSM cafés (Overpass)", "geojson"),
                kind: "geojson",
                data,
                cluster: true,
                style: { ...DEFAULT_GEOJSON_STYLE, pointColor: "#a3e635", labelField: "name" },
                metadata: {
                    provider: "Overpass API",
                    attribution: OSM_ATTR,
                    license: "ODbL",
                    homepage: "https://overpass-turbo.eu/",
                    extra: { Query: "amenity=cafe", Features: String(data.features.length) },
                    tags: ["osm", "live", "poi"],
                },
            };
        },
    },

    /* ---------------------------------------------------------------- */
    /* Weather + overlays                                                */
    /* ---------------------------------------------------------------- */
    {
        id: "openweather-precip",
        name: "OpenWeather precipitation",
        group: "Weather",
        kind: "raster",
        blurb: "Global precipitation tiles. Needs a free OpenWeather key.",
        requiresKey: true,
        keyLabel: "OpenWeather API key",
        build: ({ apiKey }) => ({
            ...base("Precipitation (OpenWeather)", "raster"),
            kind: "raster",
            tiles: [`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey ?? ""}`],
            tileSize: 256,
            maxzoom: 10,
            opacity: 0.8,
            metadata: {
                provider: "OpenWeather",
                attribution: '© <a href="https://openweathermap.org/">OpenWeather</a>',
                license: "OpenWeather free tier",
                homepage: "https://openweathermap.org/api/weathermaps",
                tags: ["weather", "raster"],
            },
        }),
    },
    {
        id: "radar-image-overlay",
        name: "Image overlay sample",
        group: "Overlays",
        kind: "image",
        blurb: "Georeferenced PNG pinned to four corners (radar over the US).",
        build: () => ({
            ...base("Radar image overlay", "image"),
            kind: "image",
            url: "https://maplibre.org/maplibre-gl-js/docs/assets/radar.gif",
            coordinates: [
                [-80.425, 46.437],
                [-71.516, 46.437],
                [-71.516, 37.936],
                [-80.425, 37.936],
            ],
            bounds: [-80.425, 37.936, -71.516, 46.437],
            opacity: 0.85,
            metadata: {
                provider: "MapLibre docs",
                attribution: "MapLibre example asset",
                license: "BSD-3-Clause",
                extra: { Corners: "TL, TR, BR, BL" },
                tags: ["image", "overlay"],
            },
        }),
    },
];

export const CATALOG_GROUPS = Array.from(new Set(CATALOG.map((entry) => entry.group)));