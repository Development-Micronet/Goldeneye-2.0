import { toast } from "react-toastify";
import { useEffect, useRef, useState } from "react";
import { useLayersStore } from "../../../../store/useLayersStore";
import useBaseMapStore from "../../hooks/useBaseMapStore";
import { useMapOptions } from "../../hooks/useMapOptions";
import useZoomStore from "../../hooks/useZoomStore";
import { useMapStore } from "../../store/useMapStore";
import { useArchiveProductStore } from "../sidebar/store/useArchiveProductStore";
import Feature from "ol/Feature";
import Map from "ol/Map";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import GeoJSON from "ol/format/GeoJSON";
import type { Type } from "ol/geom/Geometry";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import Draw, { createBox } from "ol/interaction/Draw";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import ImageStatic from "ol/source/ImageStatic";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { getArea } from "ol/sphere";
import Fill from "ol/style/Fill";
import Icon from "ol/style/Icon";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import CircleStyle from "ol/style/Circle";
import * as turf from "@turf/turf";
import { logger } from "../../../../utils/logger";
import { useArchiveHoverStore } from "../../hooks/useArchiveHoverStore";
import { usePinnedProductStore } from "../../hooks/usePinnedProductStore";
import { useSelectedAOIStore } from "../../hooks/useSelectedAOIStore";

import { useRasterLayers } from "./core/useRasterLayers";

const createOrbitBadgeCanvas = (text: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.font = "bold 13px 'Inter', sans-serif";
  const textWidth = ctx.measureText(text).width;

  const h = 26; // height
  const r = h / 2; // radius of rounded left side
  const tailWidth = 8; // length of pointed chevron tail
  const paddingLeft = 14;
  const w = textWidth + paddingLeft + tailWidth + 10; // width

  canvas.width = w;
  canvas.height = h;

  // Re-apply font after resizing canvas
  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.textBaseline = "middle";

  ctx.beginPath();
  // Rounded left side
  ctx.arc(r, r, r, 0.5 * Math.PI, 1.5 * Math.PI);
  // Top edge
  ctx.lineTo(w - tailWidth, 0);
  // Pointed tip on the right
  ctx.lineTo(w, r);
  // Bottom edge
  ctx.lineTo(w - tailWidth, h);
  // Close path
  ctx.closePath();

  // Fill background
  ctx.fillStyle = "#c28b1b";
  ctx.fill();

  // Draw text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, paddingLeft, r + 0.5); // shift 0.5 for perfect vertical alignment

  return canvas;
};

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const [mapState, setMapState] = useState<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const hoverSourceRef = useRef<VectorSource | null>(null);
  const pinSourceRef = useRef<VectorSource | null>(null);

  const {
    activeTool,
    setActiveTool,
    pointBufferDistance,
    drawRectangleCoords,
    setDrawRectangleCoords,
    plotCoordinates,
    setPlotCoordinates,
    plotBoundCoordinates,
    setPlotBoundCoordinates,
  } = useMapOptions();
  const polylineBufferDistance = useMapStore((state) => state.polylineBufferDistance);
  const polygonBufferDistance = useMapStore((state) => state.polygonBufferDistance);

  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);
  const { flyToProduct, setFlyToProduct } = useMapStore();
  const layers = useLayersStore((state) => state.layers);
  const addLayer = useLayersStore((state) => state.addLayer);
  const drawInteractionRef = useRef<Draw | null>(null);
  const lastVisibleProductIdsRef = useRef<string>("");
  const { activeLayer } = useBaseMapStore();
  const fitLayerId = useMapStore((state) => state.fitLayerId);
  const setFitLayerId = useMapStore((state) => state.setFitLayerId);
  const { zoom, setZoom, setMaxZoom, maxZoom } = useZoomStore();
  const { visibleProducts } = useArchiveProductStore();
  const hoveredProduct = useArchiveHoverStore((state) => state.hoveredProduct);
  const { pinnedProducts } = usePinnedProductStore();

  // Zoom to / fit bounds of selected layer
  useEffect(() => {
    if (!fitLayerId || !mapInstance.current) return;

    const targetLayer = layers.find((l) => l.id === fitLayerId);
    if (targetLayer) {
      try {
        const geojsonFormat = new GeoJSON();
        const feature = geojsonFormat.readFeature(targetLayer.geojson) as any;
        const geometry = feature?.getGeometry();
        if (geometry) {
          mapInstance.current.getView().fit(geometry, {
            padding: [50, 50, 50, 50],
            duration: 1000,
          });
        }
      } catch (err) {
        logger.error("Error fitting layer view:", err);
      }
    }
    setFitLayerId(null);
  }, [fitLayerId, setFitLayerId, layers]);

  // logger.log(layers);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const view = map.getView();

    const targetZoom = Math.min(zoom, maxZoom);

    if (view.getZoom() !== targetZoom) {
      view.setZoom(targetZoom);
    }
  }, [zoom, maxZoom]);

  // console.log(layers);
  useEffect(() => {
    if (!mapRef.current) return;

    // Center coordinates for India in EPSG:4326 (longitude, latitude)
    const origin = [78.9629, 20.5937];
    const minZoom = 2;
    const initialMaxZoom = 30;
    // Base Layer: OpenStreetMap
    const osmLayer = new TileLayer({
      properties: { label: "Base Layer" },
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
    // Vector Layer for User Plotted Features
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const premiumStyleFunction = (feature: any) => {
      const label = feature.get("label") || "";
      const area = feature.get("area");
      const geom = feature.getGeometry();
      const isOrbit = label && label.startsWith("Orbit:");
      const geomType = geom ? geom.getType() : "";
      const styles = [
        new Style({
          fill: new Fill({
            color: isOrbit ? "rgba(194, 139, 27, 0.15)" : "rgba(44, 102, 113, 0.15)", // Matching warm orange/brown fill for orbits
          }),
          stroke: new Stroke({
            color: isOrbit ? "#c28b1b" : "#2C6671", // Gold/brown stroke for orbits
            width: isOrbit ? (geomType === "LineString" ? 3 : 1.5) : 2.5, // Thick centerline (width 3), thin swath boundary (width 1.5)
          }),
        }),
      ];

      if (label && geom) {
        const extent = geom.getExtent();
        const topLeftCoord = [extent[0], extent[3]]; // [minX, maxY]

        // Pin label to the point on the geometry closest to the top-left corner of the bounding box
        // to ensure it is always attached to the shape rather than floating in empty space.
        let labelCoord = topLeftCoord;
        try {
          labelCoord = geom.getClosestPoint(topLeftCoord);
        } catch (e) {
          logger.error("Error getting closest point for label:", e);
        }

        const labelGeom = new Point(labelCoord);
        const displayText =
          typeof area === "number" && area > 0 ? ` ${label} ( ${area.toFixed(2)} sqkm ) ` : label;

        if (isOrbit) {
          // Skip label for orbit tracks to avoid duplicate labels
          if (label.endsWith("Track")) {
            return styles;
          }

          // Parse name and time, e.g. "Orbit: SPOT-6 (05:11 - 05:12) Swath" -> "05:11 SPOT-6"
          let badgeText = label;
          const match = label.match(/Orbit:\s*([^\(]+)\s*\(([^-\s]+)/);
          if (match) {
            const satName = match[1].trim();
            const startTime = match[2].trim();
            badgeText = `${startTime} ${satName}`;
          }

          const canvas = createOrbitBadgeCanvas(badgeText);
          styles.push(
            new Style({
              geometry: labelGeom,
              image: new Icon({
                img: canvas,
                imgSize: [canvas.width, canvas.height],
                anchor: [1, 0.5], // Anchor the pointed tip (right-center) to the coordinate
                anchorXUnits: "fraction",
                anchorYUnits: "fraction",
              }),
            })
          );
        } else {
          styles.push(
            new Style({
              geometry: labelGeom,
              text: new Text({
                text: displayText,
                font: "bold 14px 'Inter', sans-serif",
                fill: new Fill({
                  color: "#ffffff", // white text
                }),
                backgroundFill: new Fill({
                  color: "#000000", // black background
                }),
                padding: [4, 6, 4, 6], // padding for readability
                overflow: true,
                offsetX: 8,
                offsetY: -10,
                textAlign: "left",
                textBaseline: "bottom",
              }),
            }),
          );
        }
      }

      return styles;
    };
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: premiumStyleFunction,
      zIndex: 10,
    });
    const hoverSource = new VectorSource();
    const pinSource = new VectorSource();

    hoverSourceRef.current = hoverSource;
    pinSourceRef.current = pinSource;

    const hoverLayer = new VectorLayer({
      source: hoverSource,

      zIndex: 2000,

      style: new Style({
        stroke: new Stroke({
          color: "#ff9800",
          width: 3,
        }),

        fill: new Fill({
          color: "rgba(255,152,0,0.25)",
        }),
      }),
    });

    const pinLayer = new VectorLayer({
      source: pinSource,

      zIndex: 2000,
    });

    // Initialize Map with EPSG:4326 projection
    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, wmsLayer, vectorLayer, hoverLayer, pinLayer],
      controls: defaultControls({ zoom: false }),
      view: new View({
        projection: "EPSG:4326",
        center: origin,
        zoom: 4.9,
        minZoom: minZoom,
        maxZoom: initialMaxZoom,
      }),
    });

    mapInstance.current = map;
    setMapState(map);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined);
        mapInstance.current = null;
      }
      setMapState(null);
      vectorSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const view = map.getView();

    const key = view.on("change:resolution", () => {
      const currentZoom = view.getZoom();

      if (currentZoom === undefined) return;

      const roundedZoom = Math.round(currentZoom);

      const storeZoom = useZoomStore.getState().zoom;

      if (roundedZoom !== storeZoom) {
        setZoom(roundedZoom);
      }
    });

    return () => {
      unByKey(key);
    };
  }, [setZoom]);

  // Synchronize features from the global layers store with the vector source
  useEffect(() => {
    const vectorSource = vectorSourceRef.current;
    if (!vectorSource) return;

    vectorSource.clear();

    const geojsonFormat = new GeoJSON();
    layers.forEach((layer) => {
      if (layer.visible === false) return; // Skip hidden layers
      try {
        const feature = geojsonFormat.readFeature(layer.geojson) as any;
        feature.setId(layer.id);
        feature.set("label", layer.label);
        if (layer.area !== undefined) {
          feature.set("area", layer.area);
        }
        vectorSource.addFeature(feature);
      } catch (err) {
        logger.error("Error loading layer from store:", err);
      }
    });
  }, [layers]);

  useEffect(() => {
    const map = mapInstance.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    // Clean up any existing draw interaction
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    if (!activeTool) return;

    let olDrawType: Type | undefined = undefined;
    let geometryFunction = undefined;
    if (activeTool === "Polygon") {
      olDrawType = "Polygon";
    } else if (activeTool === "Point") {
      olDrawType = "Point";
    } else if (activeTool === "Polyline") {
      olDrawType = "LineString";
    } else if (activeTool === "Box") {
      olDrawType = "Circle";
      geometryFunction = createBox();
    }

    if (!olDrawType) return;

    let tooltipElement: HTMLDivElement | null = null;
    let tooltipOverlay: Overlay | null = null;
    let changeListenerKey: any = null;

    const createTooltip = () => {
      tooltipElement = document.createElement("div");
      tooltipElement.className = "ol-tooltip ol-tooltip-measure";
      tooltipElement.style.position = "relative";
      tooltipElement.style.backgroundColor = "rgba(44, 102, 113, 0.9)"; // primary teal
      tooltipElement.style.color = "white";
      tooltipElement.style.padding = "4px 8px";
      tooltipElement.style.borderRadius = "6px";
      tooltipElement.style.fontSize = "11px";
      tooltipElement.style.fontWeight = "600";
      tooltipElement.style.fontFamily = "sans-serif";
      tooltipElement.style.whiteSpace = "nowrap";
      tooltipElement.style.pointerEvents = "none";
      tooltipElement.style.border = "1px solid rgba(255, 255, 255, 0.2)";
      tooltipElement.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.15)";

      tooltipOverlay = new Overlay({
        element: tooltipElement,
        offset: [15, 0],
        positioning: "center-left",
      });
      map.addOverlay(tooltipOverlay);
    };
    const removeTooltip = () => {
      if (tooltipOverlay) {
        map.removeOverlay(tooltipOverlay);
        tooltipOverlay = null;
      }
      if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
      }
    };
    const draw = new Draw({
      type: olDrawType,
      geometryFunction: geometryFunction,
      freehand: false,
    });

    draw.on("drawstart", (event) => {
      if (activeTool === "Box" || activeTool === "Polygon") {
        createTooltip();

        const sketch = event.feature;
        const geom = sketch.getGeometry();
        if (geom) {
          changeListenerKey = geom.on("change", (evt: any) => {
            const currentGeom = evt.target;
            if (currentGeom.getType() === "Polygon") {
              const area = getArea(currentGeom, { projection: "EPSG:4326" });
              const coordinates = currentGeom.getCoordinates()[0];
              if (coordinates && coordinates.length > 0) {
                // The cursor position is the last added vertex (coordinates.length - 2)
                const coord = coordinates[coordinates.length - 2] || coordinates[0];

                if (tooltipElement && tooltipOverlay) {
                  const areaKm = area / 1000000;
                  tooltipElement.innerHTML = `Area: ${areaKm.toFixed(2)} km²`;
                  tooltipOverlay.setPosition(coord);
                }
              }
            }
          });
        }
      }
    });

    draw.on("drawend", (event) => {
      if (changeListenerKey) {
        unByKey(changeListenerKey);
        changeListenerKey = null;
      }
      removeTooltip();

      const feature = event.feature;

      if (activeTool === "Point") {
        const geometry = feature.getGeometry();
        if (geometry && geometry.getType() === "Point") {
          const coordinates = (geometry as Point).getCoordinates();
          const cx = coordinates[0];
          const cy = coordinates[1];
          // Side length B (in km) is pointBufferDistance, so center to edge is B / 2
          const buffer = parseFloat(pointBufferDistance) || 2.25;
          const dist = buffer / 2;
          // Convert km to degrees
          const latDeg = dist / 111.32;
          const cosLat = Math.cos((cy * Math.PI) / 180);
          const lonDeg = dist / (111.32 * cosLat);
          // Construct square vertices: BL, BR, TR, TL, BL
          const vertices = [
            [
              [cx - lonDeg, cy - latDeg],
              [cx + lonDeg, cy - latDeg],
              [cx + lonDeg, cy + latDeg],
              [cx - lonDeg, cy + latDeg],
              [cx - lonDeg, cy - latDeg],
            ],
          ];
          const polygonGeom = new Polygon(vertices);
          feature.setGeometry(polygonGeom);
        }
      }

      if (activeTool === "Polyline") {
        const geometry = feature.getGeometry();
        if (geometry && geometry.getType() === "LineString") {
          const bufferVal = parseFloat(polylineBufferDistance) || 0;
          if (bufferVal > 0) {
            const geojsonFormat = new GeoJSON();
            const geojson = geojsonFormat.writeFeatureObject(feature);
            const buffered = turf.buffer(geojson, bufferVal, { units: "kilometers" });
            const bufferedFeature = geojsonFormat.readFeature(buffered);
            const bufferedGeom = (bufferedFeature as any).getGeometry();
            if (bufferedGeom) {
              feature.setGeometry(bufferedGeom);
            }
          }
        }
      }

      if (activeTool === "Polygon") {
        const geometry = feature.getGeometry();
        if (geometry && geometry.getType() === "Polygon") {
          const bufferVal = parseFloat(polygonBufferDistance) || 0;
          if (bufferVal > 0) {
            const geojsonFormat = new GeoJSON();
            const geojson = geojsonFormat.writeFeatureObject(feature);
            const buffered = turf.buffer(geojson, bufferVal, { units: "kilometers" });
            const bufferedFeature = geojsonFormat.readFeature(buffered);
            const bufferedGeom = (bufferedFeature as any).getGeometry();
            if (bufferedGeom) {
              feature.setGeometry(bufferedGeom);
            }
          }
        }
      }

      // Serialize feature to GeoJSON and add to layers store
      const geojsonFormat = new GeoJSON();
      const geojson = geojsonFormat.writeFeatureObject(feature);
      const geometry = feature.getGeometry();
      let area: number | undefined = undefined;
      if (
        geometry &&
        (activeTool === "Polygon" || activeTool === "Box" || activeTool === "Point")
      ) {
        area = getArea(geometry, { projection: "EPSG:4326" }) / 1000000;
      }

      const newLayer = addLayer({
        type: activeTool!,
        geojson: geojson,
        area: area,
      });

      // Auto-select the newly drawn layer as the active AOI for Archive Search
      setSelectedAOI(newLayer.id);

      toast.success(`${newLayer.label} plotted successfully`);
      setMaxZoom(18);

      // Deactivate tool once drawing completes with a small timeout to prevent race condition
      setTimeout(() => {
        setActiveTool(null);
      }, 50);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;

    return () => {
      if (drawInteractionRef.current && mapInstance.current) {
        mapInstance.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (changeListenerKey) {
        unByKey(changeListenerKey);
      }
      removeTooltip();
    };
  }, [activeTool, setActiveTool, pointBufferDistance, polylineBufferDistance, polygonBufferDistance]);

  useEffect(() => {
    if (!drawRectangleCoords) return;

    const vectorSource = vectorSourceRef.current;
    const map = mapInstance.current;
    if (!vectorSource || !map) return;

    const { topLeftLat, topLeftLon, bottomRightLat, bottomRightLon } = drawRectangleCoords;
    // Construct rectangle corners: Top-Left, Top-Right, Bottom-Right, Bottom-Left, closing Top-Left
    // EPSG:4326 coordinates order in OpenLayers is [longitude, latitude]
    const coords = [
      [
        [topLeftLon, topLeftLat], // Top-Left
        [bottomRightLon, topLeftLat], // Top-Right
        [bottomRightLon, bottomRightLat], // Bottom-Right
        [topLeftLon, bottomRightLat], // Bottom-Left
        [topLeftLon, topLeftLat], // closing Top-Left
      ],
    ];
    const rectGeometry = new Polygon(coords);
    const rectFeature = new Feature({
      geometry: rectGeometry,
      name: "Coordinate Rectangle Layer",
    });
    // Serialize to GeoJSON and add to layers store
    const geojsonFormat = new GeoJSON();
    const geojson = geojsonFormat.writeFeatureObject(rectFeature);
    const area = getArea(rectGeometry, { projection: "EPSG:4326" }) / 1000000;
    const newLayer = addLayer({
      type: "Coordinates",
      geojson: geojson,
      area: area,
    });

    // Auto-select the newly plotted layer as the active AOI for Archive Search
    setSelectedAOI(newLayer.id);

    map.getView().fit(rectGeometry, {
      padding: [50, 50, 50, 50],
      duration: 1000,
    });

    toast.success(`${newLayer.label} plotted successfully from coordinates`);

    // Clear state after drawing
    setDrawRectangleCoords(null);
  }, [drawRectangleCoords, setDrawRectangleCoords, addLayer]);

  useEffect(() => {
    if (!plotCoordinates || !mapInstance.current) return;

    const { lat, lon, width, height, shape, area } = plotCoordinates;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const latOffset = halfHeight / 111.32;
    const lonOffset = halfWidth / (111.32 * Math.cos((lat * Math.PI) / 180));
    const geometry = new Polygon([
      [
        [lon - lonOffset, lat - latOffset],
        [lon + lonOffset, lat - latOffset],
        [lon + lonOffset, lat + latOffset],
        [lon - lonOffset, lat + latOffset],
        [lon - lonOffset, lat - latOffset],
      ],
    ]);
    const feature = new Feature({
      geometry,
    });

    feature.set("label", shape);
    feature.set("area", area);

    const geojsonFormat = new GeoJSON();
    const geojson = geojsonFormat.writeFeatureObject(feature);
    const newLayer = addLayer({
      type: "Coordinates",
      geojson,
      area,
    });

    // Auto-select the newly plotted layer as the active AOI for Archive Search
    setSelectedAOI(newLayer.id);

    toast.success(`${newLayer.label} plotted successfully`);

    mapInstance.current.getView().fit(geometry, {
      padding: [50, 50, 50, 50],
      duration: 1000,
    });

    setPlotCoordinates(null);
  }, [plotCoordinates, addLayer, setPlotCoordinates]);

  useEffect(() => {
    if (!plotBoundCoordinates || !mapInstance.current) return;

    const { upperLeft, lowerRight, area } = plotBoundCoordinates;
    // Polygon coordinates order: [longitude, latitude]
    const coords = [
      [
        [upperLeft.lon, upperLeft.lat], // Top Left
        [lowerRight.lon, upperLeft.lat], // Top Right
        [lowerRight.lon, lowerRight.lat], // Bottom Right
        [upperLeft.lon, lowerRight.lat], // Bottom Left
        [upperLeft.lon, upperLeft.lat], // Close polygon
      ],
    ];
    const geometry = new Polygon(coords);
    const feature = new Feature({
      geometry,
    });

    feature.set("label", "Bound Coordinates");
    feature.set("area", area);

    const geojsonFormat = new GeoJSON();
    const geojson = geojsonFormat.writeFeatureObject(feature);
    const newLayer = addLayer({
      type: "Bound Coordinates",
      geojson,
      area,
    });

    // Auto-select the newly plotted layer as the active AOI for Archive Search
    setSelectedAOI(newLayer.id);

    toast.success(`${newLayer.label} plotted successfully`);

    mapInstance.current.getView().fit(geometry, {
      padding: [50, 50, 50, 50],
      duration: 1000,
    });

    setPlotBoundCoordinates(null);
  }, [plotBoundCoordinates, addLayer, setPlotBoundCoordinates]);

  useEffect(() => {
    if (!mapInstance.current) return;

    let sourceUrl = "";
    let attributions = "";

    switch (activeLayer) {
      case "Google Road Map":
        sourceUrl = "http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
        attributions = "Google Road Map";
        break;

      case "ESRI Imagery":
        sourceUrl =
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        attributions = "© Esri";
        break;

      default:
        sourceUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        attributions = "© OpenStreetMap contributors";
    }

    const baseLayer = mapInstance.current
      .getLayers()
      .getArray()
      .find((l) => l.get("label") === "Base Layer") as TileLayer<XYZ> | undefined;

    if (!baseLayer) return;

    const source = new XYZ({
      url: sourceUrl,
      attributions,
    });

    baseLayer.setSource(source);
  }, [activeLayer]);

  useEffect(() => {
    if (!mapInstance.current || !visibleProducts.length) return;

    const currentIds = visibleProducts
      .map((p) => p.id)
      .sort()
      .join(",");

    // Skip rebuild if the underlying product set hasn't actually changed
    // (avoids re-fetching/re-flickering images on unrelated re-renders,
    // e.g. zoom changes that produce a new array reference).
    if (currentIds === lastVisibleProductIdsRef.current) {
      return;
    }
    lastVisibleProductIdsRef.current = currentIds;

    const map = mapInstance.current;
    const imageLayers: ImageLayer<ImageStatic>[] = [];

    const hasNonJpg = visibleProducts.some((product) => {
      if (!product.imageUrl) return false;
      const url = product.imageUrl.toLowerCase().split("?")[0];
      const isJpg = url.endsWith(".jpg") || url.endsWith(".jpeg");
      return !isJpg;
    });

    const computedMaxZoom = hasNonJpg ? 14 : 18;
    setMaxZoom(computedMaxZoom);

    visibleProducts.forEach((product) => {
      if (!product.imageUrl || !product.geometry) return;

      const feature = new GeoJSON().readFeature({
        type: "Feature",
        geometry: product.geometry,
      });

      if (Array.isArray(feature)) return;

      const geometry = feature.getGeometry();
      if (!geometry) return;

      const imageLayer = new ImageLayer({
        source: new ImageStatic({
          url: product.imageUrl,
          imageExtent: geometry.getExtent(),
          projection: "EPSG:4326",
        }),
        opacity: 0.85,
        zIndex: 20,
      });

      map.addLayer(imageLayer);
      imageLayers.push(imageLayer);
    });

    // Keep AOI/vector layers above images
    map.getLayers().forEach((layer) => {
      if (layer instanceof VectorLayer) {
        layer.setZIndex(1000);
      }
    });

    if (imageLayers.length) {
      const extent = imageLayers.reduce(
        (acc, layer) => {
          const imageExtent = layer.getSource()?.getImageExtent();
          if (!imageExtent) return acc;
          if (!acc) return imageExtent;
          return [
            Math.min(acc[0], imageExtent[0]),
            Math.min(acc[1], imageExtent[1]),
            Math.max(acc[2], imageExtent[2]),
            Math.max(acc[3], imageExtent[3]),
          ];
        },
        null as number[] | null,
      );

      if (extent) {
        map.getView().fit(extent, {
          padding: [100, 100, 100, 100],
          duration: 500,
          maxZoom: computedMaxZoom,
        });
      }
    }

    return () => {
      imageLayers.forEach((layer) => {
        map.removeLayer(layer);
      });
    };
  }, [visibleProducts, setMaxZoom]);

  useEffect(() => {
    if (!mapInstance.current || !flyToProduct?.geometry) return;

    const map = mapInstance.current;

    const feature = new GeoJSON().readFeature({
      type: "Feature",
      geometry: flyToProduct.geometry,
    });

    if (Array.isArray(feature)) return;

    const geometry = feature.getGeometry();

    if (!geometry) return;

    map.getView().fit(geometry.getExtent(), {
      padding: [100, 100, 100, 100],
      duration: 800,
      maxZoom: 16,
    });

    // clear after animation
    setFlyToProduct(null);
  }, [flyToProduct, setFlyToProduct]);

  const searchLocation = useMapStore((state) => state.searchLocation);

  useEffect(() => {
    if (!mapInstance.current || !searchLocation) return;
    const map = mapInstance.current;

    // Animate map view directly to zoom level 18 centered on the searched location
    map.getView().animate({
      center: [searchLocation.lon, searchLocation.lat],
      zoom: 18,
      duration: 1000,
    });

    setZoom(18);

    if (pinSourceRef.current) {
      pinSourceRef.current.clear();
      const pinFeature = new Feature({
        geometry: new Point([searchLocation.lon, searchLocation.lat]),
        name: searchLocation.displayName,
      });
      pinFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({ color: "#2c6671" }),
            stroke: new Stroke({ color: "#ffffff", width: 3 }),
          }),
          text: new Text({
            text: ` ${searchLocation.displayName.split(",")[0]} `,
            font: "bold 13px 'Inter', sans-serif",
            fill: new Fill({ color: "#ffffff" }),
            backgroundFill: new Fill({ color: "#2c6671" }),
            padding: [4, 8, 4, 8],
            offsetY: -22,
          }),
        })
      );
      pinSourceRef.current.addFeature(pinFeature);
    }
  }, [searchLocation, mapState, setZoom]);

  useEffect(() => {
    const hoverSource = hoverSourceRef.current;

    if (!hoverSource) return;

    // clear old hover
    hoverSource.clear();

    if (!hoveredProduct) return;

    const format = new GeoJSON();

    // Product geometry
    const productFeature = format.readFeature({
      type: "Feature",
      geometry: hoveredProduct.geometry,
    });

    const productGeo = format.writeFeatureObject(productFeature as any);

    // Get AOIs
    const aoiLayers = layers.filter((layer) =>
      ["Polygon", "Box", "Point", "Coordinates", "Bound Coordinates"].includes(layer.type),
    );

    aoiLayers.forEach((aoiLayer) => {
      const aoiFeature = format.readFeature(aoiLayer.geojson);

      const aoiGeo = format.writeFeatureObject(aoiFeature as any);

      // AOI ∩ Image footprint
      const intersection = turf.intersect(turf.featureCollection([aoiGeo, productGeo] as any));

      if (intersection) {
        const commonFeature = format.readFeature(intersection);

        (commonFeature as any).setStyle(
          new Style({
            fill: new Fill({
              color: "rgba(255,152,0,0.45)",
            }),
          }),
        );

        hoverSource.addFeature(commonFeature as any);
      }
    });

    return () => {
      hoverSource.clear();
    };
  }, [hoveredProduct, layers]);

  useEffect(() => {
    const source = pinSourceRef.current;

    if (!source) return;
    // remove old pins
    source.clear();

    if (pinnedProducts.length === 0) return;

    const format = new GeoJSON();

    const aoiLayers = layers.filter((layer) =>
      ["Polygon", "Box", "Point", "Coordinates", "Bound Coordinates"].includes(layer.type),
    );

    pinnedProducts.forEach((product) => {
      const productFeature = format.readFeature({
        type: "Feature",

        geometry: product.geometry,
      });

      const productGeo = format.writeFeatureObject(productFeature as any);

      aoiLayers.forEach((aoiLayer) => {
        const aoiFeature = format.readFeature(aoiLayer.geojson);

        const aoiGeo = format.writeFeatureObject(aoiFeature as any);

        const intersection = turf.intersect(turf.featureCollection([aoiGeo, productGeo] as any));

        if (intersection) {
          const feature = format.readFeature(intersection);

          (feature as any).set("productId", product.id);

          (feature as any).setStyle(
            new Style({
              fill: new Fill({
                color: "rgba(255,204,128,0.50)",
              }),
            }),
          );

          source.addFeature(feature as any);
        }
      });
    });

    return () => {
      source.clear();
    };
  }, [pinnedProducts, layers]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const view = map.getView();

    view.setMaxZoom(maxZoom);
  }, [maxZoom]);

  const prevAoiCountRef = useRef(0);

  useEffect(() => {
    const aoiTypes = ["Polygon", "Box", "Point", "Coordinates", "Bound Coordinates"];
    const aoiLayers = layers.filter(
      (layer) => aoiTypes.includes(layer.type) && !layer.label.startsWith("Orbit:")
    );

    // Only auto-select if a new drawn layer has been added (count increased)
    if (aoiLayers.length > prevAoiCountRef.current) {
      const latestAOI = aoiLayers[aoiLayers.length - 1];
      setSelectedAOI(latestAOI.id);
    }

    prevAoiCountRef.current = aoiLayers.length;
  }, [layers, setSelectedAOI]);


  useRasterLayers(mapState);
  return <div className="h-full w-full" ref={mapRef} id="map-container" />;
}
