import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import { defaults as defaultControls } from "ol/control";
import "ol/ol.css";

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Center coordinates for India in EPSG:4326 (longitude, latitude)
    const origin = [78.9629, 20.5937];
    const minZoom = 2;
    const maxZoom = 19;

    // Base Layer: OpenStreetMap
    const osmLayer = new TileLayer({
      source: new OSM(),
    });

    // WMS Layer: India Shapefile Boundary
    const wmsLayer = new TileLayer({
      properties: { label: "India Shapefile WMS Layer" },
      source: new TileWMS({
        url: import.meta.env.VITE_GEOSERVER_WMS_URL,
        params: {
          LAYERS: "indialayer:india_India_Country_Boundary",
          TILED: true,
          FORMAT: "image/png",
          VERSION: "1.1.1",
          SRS: "EPSG:4326",
        },
        attributions: "India Shapefile WMS Layer",
      }),
      zIndex: 1,
    });

    // Initialize Map with EPSG:4326 projection
    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, wmsLayer],
      controls: defaultControls({ zoom: false }),
      view: new View({
        projection: "EPSG:4326",
        center: origin,
        zoom: 4.9,
        minZoom: minZoom,
        maxZoom: maxZoom,
      }),
    });

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined);
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full" ref={mapRef} id="map-container" />
  );
}
