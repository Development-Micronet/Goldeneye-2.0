import type { LayerSpecification } from "maplibre-gl";

export type AppLayerType = "2d" | "3d";

export interface AppMapLayer {
    id: string;
    name: string;
    type: AppLayerType;
    sourceId: string;
    visibleByDefault: boolean;
    tiles?: string[]; // optional tile URL templates
    attribution?: string;
    layer: LayerSpecification;
}

export const MAP_LAYERS: AppMapLayer[] = [


    // ============================================================
    // OPENSTREETMAP
    // ============================================================

    {
        id: "op",
        name: "OpenStreetMap",
        type: "2d",
        sourceId: "osm",
        visibleByDefault: true,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],

        layer: {
            id: "op",
            type: "raster",
            source: "osm",
        },
    },

    // ============================================================
    // ESRI SATELLITE
    // ============================================================

    {
        id: "esri-satellite",
        name: "Satellite",
        type: "2d",
        sourceId: "esri-satellite",
        visibleByDefault: false,
        tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],

        layer: {
            id: "esri-satellite",
            type: "raster",
            source: "esri-satellite",
        },
    },

    // ============================================================
    // ESRI STREET MAP
    // ============================================================

    {
        id: "esri-street",
        name: "Esri Street Map",
        type: "2d",
        sourceId: "esri-street",
        visibleByDefault: false,
        tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        ],

        layer: {
            id: "esri-street",
            type: "raster",
            source: "esri-street",
        },
    },


];
