import { toast } from "react-toastify";
import { useEffect, useRef, useState } from "react";
import { useLayersStore } from "../../../../store/useLayersStore";
import useBaseMapStore from "../../hooks/useBaseMapStore";
import { useMapOptions } from "../../hooks/useMapOptions";
import useZoomStore, { UNRESTRICTED_MAX_ZOOM } from "../../hooks/useZoomStore";
import { useIsSpecialZoomCategory } from "../../../../utils/zoomPermissions";
import { useMapStore } from "../../store/useMapStore";
import { type SelectedArchiveProduct, useArchiveProductStore } from "../sidebar/store/useArchiveProductStore";


import Collection from "ol/Collection";
import Feature from "ol/Feature";
import OLMap from "ol/Map";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import GeoJSON from "ol/format/GeoJSON";
import type { Type } from "ol/geom/Geometry";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import Draw, { createBox } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import Snap from "ol/interaction/Snap";
import BaseLayer from "ol/layer/Base";
import { getVectorContext } from "ol/render";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import ImageStatic from "ol/source/ImageStatic";
import ImageWMS from "ol/source/ImageWMS";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
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
import { useAuthStore } from "../../../../store/useAuthStore";

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
  const mapInstance = useRef<OLMap | null>(null);
  const [mapState, setMapState] = useState<OLMap | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  // Features that Modify is allowed to touch. Orbit swath/track overlays are
  // display-only, so they are deliberately kept out of this collection.
  const editableFeaturesRef = useRef<Collection<Feature>>(new Collection());
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
  const setMap = useSelectedAOIStore((state) => state.setMap);
  const setSelectedAOI = useSelectedAOIStore((state) => state.setSelectedAOI);
  const selectedAOIId = useSelectedAOIStore((state) => state.selectedAOIId);
  const selectedAOIIdRef = useRef<string | null>(null);
  const { flyToProduct, setFlyToProduct } = useMapStore();
  const layers = useLayersStore((state) => state.layers);
  const addLayer = useLayersStore((state) => state.addLayer);
  const drawInteractionRef = useRef<Draw | null>(null);
  const selectRef = useRef<Select | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const lastVisibleProductIdsRef = useRef<string>("");
  const productLayersRef = useRef<Map<string, BaseLayer>>(new Map());
  const productAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const { activeLayer } = useBaseMapStore();
  const fitLayerId = useMapStore((state) => state.fitLayerId);
  const setFitLayerId = useMapStore((state) => state.setFitLayerId);
  const { zoom, setZoom, setMaxZoom, maxZoom } = useZoomStore();
  const isSpecialCategoryUser = useIsSpecialZoomCategory();
  const { visibleProducts } = useArchiveProductStore();
  const hoveredProduct = useArchiveHoverStore((state) => state.hoveredProduct);
  const { pinnedProducts } = usePinnedProductStore();

  const getAoiFitOptions = (areaKm2?: number) => {
    let maxZoom = 12.5;
    if (areaKm2 && !isNaN(areaKm2)) {
      if (areaKm2 > 1000) maxZoom = 9.5;
      else if (areaKm2 > 200) maxZoom = 12;
      else if (areaKm2 > 50) maxZoom = 12.5;
      else if (areaKm2 > 10) maxZoom = 13;
      else maxZoom = 13.5;
    }
    return {
      padding: [120, 150, 120, 150],
      duration: 800,
      maxZoom,
    };
  };

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
          const area = targetLayer.area ?? (getArea(geometry, { projection: "EPSG:4326" }) / 1000000);
          mapInstance.current.getView().fit(geometry, getAoiFitOptions(area));
        }
      } catch (err) {
        logger.error("Error fitting layer view:", err);
      }
    }
    setFitLayerId(null);
  }, [fitLayerId, setFitLayerId, layers]);

  useEffect(() => {
    const map = mapInstance.current;
    const vectorSource = vectorSourceRef.current;

    if (!map || !vectorSource) return;

    // AOI select karne ke liye
    const select = new Select({
      condition: click,
    });

    // Selected AOI ko edit karne ke liye
    const modify = new Modify({
      features: select.getFeatures(),
      style: () => {
        return undefined;
      },
    });

    // User AOI par click kare
    select.on("select", (event) => {
      const selectedFeature = event.selected[0];

      if (!selectedFeature) {
        return;
      }

      console.log("AOI clicked:", selectedFeature);

      // AOI ID
      const aoiId = selectedFeature.getId();

      console.log("AOI ID:", aoiId);
    });

    // User AOI ka point/vertex move kare
    modify.on("modifyend", (event) => {
      event.features.forEach((feature) => {
        console.log("AOI edited:", feature);

        const geometry = feature.getGeometry();

        if (!geometry) return;

        console.log(
          "New coordinates:",
          geometry.getCoordinates()
        );
      });
    });

    // Map par interactions add karo
    map.addInteraction(select);
    map.addInteraction(modify);

    selectRef.current = select;
    modifyRef.current = modify;

    // Cleanup
    return () => {
      map.removeInteraction(select);
      map.removeInteraction(modify);

      selectRef.current = null;
      modifyRef.current = null;
    };
  }, []);



  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const view = map.getView();
    if (view.getAnimating()) return;

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
    const initialMaxZoom = 40;
    // Base Layer: OpenStreetMap
    const osmLayer = new TileLayer({
      properties: { label: "Base Layer" },
      source: new OSM(),
    });
    // WMS Layer: India Shapefile Boundary
    const wmsLayer = new TileLayer({
      properties: { label: "India Shapefile WMS Layer" },
      source: new TileWMS({
        url:
          import.meta.env.VITE_GEOSERVER_WMS_URL ||
          "https://geoserver.goldeneye.net.in/geoserver/indialayer/wms",
        params: {
          LAYERS: "indialayer:india_India_Country_Boundary",
          TILED: true,
          FORMAT: "image/png",
          VERSION: "1.1.1",
          SRS: "EPSG:4326",
        },
        crossOrigin: "anonymous",
        serverType: "geoserver",
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
      const featureId = feature.getId();
      const isSelected = featureId != null && String(featureId) === selectedAOIIdRef.current;
      const styles = [
        new Style({
          // fill: new Fill({
          //   color: isOrbit ? "rgba(194, 139, 27, 0.15)" : "rgba(44, 102, 113, 0.15)", // Matching warm orange/brown fill for orbits
          // }),
          fill: new Fill({
            color: isOrbit
              ? "rgba(194, 139, 27, 0.15)"
              : isSelected
                ? "rgba(0, 56, 255, 0.10)"
                : "rgba(44, 102, 113, 0.15)",
          }),
          stroke: new Stroke({
            color: isOrbit ? "#c28b1b" : isSelected ? "#0038ff" : "#2C6671", // Highlight selected AOI in orange
            width: isOrbit
              ? geomType === "LineString"
                ? 3
                : 1.5
              : isSelected
                ? 3.5
                : 2.5, // Thicker outline when this AOI is the selected one
          }),
          ...(geomType === "Point" || geomType === "MultiPoint"
            ? {
              image: new CircleStyle({
                radius: isSelected ? 8 : 6,
                fill: new Fill({
                  color: isSelected ? "#0038ff" : "#2C6671",
                }),
                stroke: new Stroke({
                  color: "#ffffff",
                  width: 2,
                }),
              }),
            }
            : {}),
        }),
      ];

      if (label && geom) {
        const extent = geom.getExtent();
        // Fallback to top-left of bounding box
        let labelCoord = [extent[0], extent[3]];

        try {
          // Find the absolute highest vertex (Max Y)
          const type = geom.getType();
          if (type === 'Polygon' || type === 'MultiPolygon' || type === 'LineString') {
            // Using getCoordinates() is safer than getFlatCoordinates() because it avoids stride issues
            const getHighestFromRing = (ring) => {
              let maxY = -Infinity;
              let maxX = 0;
              for (const coord of ring) {
                if (coord[1] > maxY) {
                  maxY = coord[1];
                  maxX = coord[0];
                }
              }
              return [maxX, maxY];
            };

            const coords = geom.getCoordinates();
            if (type === 'Polygon') {
              // coords is array of rings, index 0 is outer ring
              if (coords.length > 0) labelCoord = getHighestFromRing(coords[0]);
            } else if (type === 'MultiPolygon') {
              // coords is array of polygons
              let globalMaxY = -Infinity;
              let globalMaxX = 0;
              for (const poly of coords) {
                if (poly.length > 0) {
                  const [x, y] = getHighestFromRing(poly[0]);
                  if (y > globalMaxY) {
                    globalMaxY = y;
                    globalMaxX = x;
                  }
                }
              }
              labelCoord = [globalMaxX, globalMaxY];
            } else if (type === 'LineString') {
              labelCoord = getHighestFromRing(coords);
            }
          } else {
            labelCoord = geom.getClosestPoint([extent[0], extent[3]]);
          }
        } catch (e) {
          console.error("Error calculating highest point for label:", e);
          labelCoord = geom.getClosestPoint([extent[0], extent[3]]);
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
                width: canvas.width,
                height: canvas.height,
                anchor: [1, 0.5], // Anchor the pointed tip (right-center) to the coordinate
                anchorXUnits: "fraction",
                anchorYUnits: "fraction",
              }),
            }),
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
                offsetX: 0,
                offsetY: -12,
                textAlign: "center",
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
    vectorLayerRef.current = vectorLayer;
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
    const map = new OLMap({
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
    setMap(map);
    setMapState(map);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined);
        mapInstance.current = null;
      }
      setMapState(null);
      vectorSourceRef.current = null;
      vectorLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const view = map.getView();

    const updateZoomFromView = () => {
      if (view.getAnimating()) return;
      const currentZoom = view.getZoom();

      if (currentZoom === undefined) return;

      const roundedZoom = Math.round(currentZoom);

      const storeZoom = useZoomStore.getState().zoom;

      if (roundedZoom !== storeZoom) {
        setZoom(roundedZoom);
      }
    };

    const key = view.on("change:resolution", updateZoomFromView);
    const moveEndKey = map.on("moveend", updateZoomFromView);

    return () => {
      unByKey(key);
      unByKey(moveEndKey);
    };
  }, [setZoom]);

  // Synchronize features from the global layers store with the vector source
  useEffect(() => {
    const vectorSource = vectorSourceRef.current;
    if (!vectorSource) return;

    vectorSource.clear();
    editableFeaturesRef.current.clear();

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

        // Orbit swath/track overlays are read-only map annotations, not AOIs.
        // Keep them out of the editable collection so Modify can't add
        // draggable vertex handles to them.
        if (!layer.label.startsWith("Orbit:")) {
          editableFeaturesRef.current.push(feature);
        }
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
      const mapProjection = map.getView().getProjection();
      const geojsonFormat = new GeoJSON();

      // Convert raw drawn feature to EPSG:4326 GeoJSON for validation
      const rawGeoJSON = geojsonFormat.writeFeatureObject(feature, {
        featureProjection: mapProjection,
        dataProjection: "EPSG:4326",
      });

      // 1. FIRST VALIDATION: Check raw drawn shape for self-intersecting lines (kinks)
      try {
        const kinks = turf.kinks(rawGeoJSON as any);
        if (kinks && kinks.features && kinks.features.length > 0) {
          toast.error(
            "Invalid AOI: Self-intersecting lines detected. Please draw a valid boundary without crossing lines.",
          );
          vectorSourceRef.current?.removeFeature(feature);
          setTimeout(() => {
            setActiveTool(null);
          }, 50);
          return; // STOP execution! Do not add layer or select AOI
        }
      } catch (err) {
        console.error("AOI self-intersection validation error:", err);
      }

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

      // if (activeTool === "Polyline") {
      //   const geometry = feature.getGeometry();
      //   if (geometry && geometry.getType() === "LineString") {
      //     const bufferVal = parseFloat(polylineBufferDistance) || 0;
      //     if (bufferVal > 0) {
      //       const buffered = turf.buffer(rawGeoJSON as any, bufferVal, { units: "kilometers" });
      //       const bufferedFeature = geojsonFormat.readFeature(buffered, {
      //         dataProjection: "EPSG:4326",
      //         featureProjection: mapProjection,
      //       });
      //       const bufferedGeom = (bufferedFeature as any).getGeometry();
      //       if (bufferedGeom) {
      //         feature.setGeometry(bufferedGeom);
      //       }
      //     }
      //   }
      // }
      if (activeTool === "Polyline") {
        const geometry = feature.getGeometry();

        if (geometry && geometry.getType() === "LineString") {
          const bufferVal = parseFloat(polylineBufferDistance) || 0;

          if (bufferVal > 0) {
            const buffered = turf.buffer(rawGeoJSON as any, bufferVal, {
              units: "kilometers",
              steps: 32, // rounded corners/caps
            });

            if (!buffered) {
              toast.error("Unable to create polyline buffer.");
              vectorSourceRef.current?.removeFeature(feature);
              setActiveTool(null);
              return;
            }

            const bufferedFeature = geojsonFormat.readFeature(buffered, {
              dataProjection: "EPSG:4326",
              featureProjection: mapProjection,
            });

            const bufferedGeom = bufferedFeature.getGeometry();

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
            const buffered = turf.buffer(rawGeoJSON as any, bufferVal, { units: "kilometers" });
            const bufferedFeature = geojsonFormat.readFeature(buffered, {
              dataProjection: "EPSG:4326",
              featureProjection: mapProjection,
            });
            const bufferedGeom = (bufferedFeature as any).getGeometry();
            if (bufferedGeom) {
              feature.setGeometry(bufferedGeom);
            }
          }
        }
      }

      // Final GeoJSON object after buffering
      const geojson = geojsonFormat.writeFeatureObject(feature, {
        featureProjection: mapProjection,
        dataProjection: "EPSG:4326",
      });

      const geometry = feature.getGeometry();
      let area: number | undefined = undefined;
      if (
        geometry &&
        (activeTool === "Polygon" ||
          activeTool === "Box" ||
          activeTool === "Point" ||
          activeTool === "Polyline")
      ) {
        area = getArea(geometry, { projection: "EPSG:4326" }) / 1000000;
        if (area <= 0 || isNaN(area)) {
          toast.error("Invalid AOI: Area must be greater than 0 sq km.");
          vectorSourceRef.current?.removeFeature(feature);
          setTimeout(() => {
            setActiveTool(null);
          }, 50);
          return; // STOP execution! Do not add layer or select AOI
        }
      }

      const newLayer = addLayer({
        type: activeTool!,
        geojson: geojson,
        area: area,
      });

      // Auto-select the newly drawn layer as active AOI to center and focus with smooth zoom
      setSelectedAOI(newLayer.id);

      // Smoothly zoom map to fit the newly drawn shape UI extent
      // if (geometry) {
      //   const currentZoom = map.getView().getZoom() || 5;
      //   const targetMaxZoom = isSpecialCategoryUser
      //     ? UNRESTRICTED_MAX_ZOOM
      //     : currentZoom <= 6
      //       ? 7
      //       : currentZoom > 10
      //         ? Math.max(Math.ceil(currentZoom), 18)
      //         : 10;
      //   map.getView().fit(geometry, {
      //     padding: [120, 120, 120, 120],
      //     duration: 800,
      //     maxZoom: targetMaxZoom,
      //   });
      // }

      toast.success(`${newLayer.label} plotted successfully`);
      if (!isSpecialCategoryUser) {
        setMaxZoom(18);
      } else {
        setMaxZoom(UNRESTRICTED_MAX_ZOOM);
      }

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
  }, [
    activeTool,
    setActiveTool,
    pointBufferDistance,
    polylineBufferDistance,
    polygonBufferDistance,
  ]);

  // Enable corner vertex editing on any existing AOI shape by clicking/dragging its corners.
  // Active whenever no draw tool is selected, so a user can edit an AOI right after drawing it,
  // or later by clicking a vertex on any AOI already on the map.
  useEffect(() => {
    const map = mapInstance.current;
    const vectorSource = vectorSourceRef.current;

    if (modifyInteractionRef.current && map) {
      map.removeInteraction(modifyInteractionRef.current);
      modifyInteractionRef.current = null;
    }
    if (snapInteractionRef.current && map) {
      map.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    if (!map || !vectorSource) return;

    // Do not activate modify while drawing a new shape
    if (activeTool) return;

    const geojsonFormat = new GeoJSON();

    // Small handle dot shown on every editable vertex
    const handleStyle = new Style({
      image: new CircleStyle({
        radius: 4.5,
        fill: new Fill({ color: "#2C6671" }),
        stroke: new Stroke({ color: "#ffffff", width: 1.2 }),
      }),
    });

    const modify = new Modify({
      features: editableFeaturesRef.current,
      style: handleStyle,
    });
    const snap = new Snap({ source: vectorSource });

    modify.on("modifyend", (evt: any) => {
      const modifiedFeatures = evt.features;
      const mapProjection = map.getView().getProjection();

      modifiedFeatures.forEach((feat: any) => {
        const id = feat.getId();
        if (!id) return;

        const updatedGeoJSON = geojsonFormat.writeFeatureObject(feat, {
          featureProjection: mapProjection,
          dataProjection: "EPSG:4326",
        });

        // Validation: reject self-intersecting edits and revert to the last valid shape
        try {
          const kinks = turf.kinks(updatedGeoJSON as any);
          if (kinks && kinks.features && kinks.features.length > 0) {
            toast.error("Invalid AOI: Self-intersecting lines detected. Modification reverted.");
            const currentStoreLayers = useLayersStore.getState().layers;
            const originalLayer = currentStoreLayers.find((l) => l.id === id);
            if (originalLayer) {
              const origFeature = geojsonFormat.readFeature(originalLayer.geojson);
              const origFeatureSingle = Array.isArray(origFeature) ? origFeature[0] : origFeature;
              const origGeom = origFeatureSingle?.getGeometry();
              if (origGeom) feat.setGeometry(origGeom);
            }
            return;
          }
        } catch (err) {
          console.error("AOI modify validation error:", err);
        }

        const geom = feat.getGeometry();
        let area: number | undefined = undefined;
        if (geom) {
          area = getArea(geom, { projection: "EPSG:4326" }) / 1000000;
          feat.set("area", area);
        }

        useLayersStore.getState().updateLayerGeojson(String(id), updatedGeoJSON, area);
      });

      vectorSource.changed();
    });

    map.addInteraction(modify);
    map.addInteraction(snap);
    modifyInteractionRef.current = modify;
    snapInteractionRef.current = snap;

    return () => {
      if (mapInstance.current) {
        if (modifyInteractionRef.current) {
          mapInstance.current.removeInteraction(modifyInteractionRef.current);
          modifyInteractionRef.current = null;
        }
        if (snapInteractionRef.current) {
          mapInstance.current.removeInteraction(snapInteractionRef.current);
          snapInteractionRef.current = null;
        }
      }
    };
  }, [activeTool]);

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

    map.getView().fit(rectGeometry, getAoiFitOptions(area));

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

    mapInstance.current.getView().fit(geometry, getAoiFitOptions(area));

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

    mapInstance.current.getView().fit(geometry, getAoiFitOptions(area));

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

  // Cleanup all product layers on MapView unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        productLayersRef.current.forEach((layer) => {
          try {
            mapInstance.current?.removeLayer(layer);
          } catch {
            // ignore
          }
        });
      }
      productLayersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const visibleIds = new Set(visibleProducts.map((p) => p.id));

    // 1. Remove ONLY layers for products that are no longer visible, cancelling any pending tile loads
    for (const [id, layer] of productLayersRef.current.entries()) {
      const baseId = id.replace(/_wmts$/, "").replace(/_static$/, "");
      if (!visibleIds.has(baseId)) {
        try {
          const controller = productAbortControllersRef.current.get(baseId);
          if (controller) {
            controller.abort();
            productAbortControllersRef.current.delete(baseId);
          }
          const source = (layer as any).getSource?.();
          if (source) {
            if (typeof source.clear === "function") source.clear();
            if (typeof source.setTileLoadFunction === "function") {
              source.setTileLoadFunction(() => { });
            }
          }
          map.removeLayer(layer);
          if (typeof (layer as any).dispose === "function") {
            (layer as any).dispose();
          }
        } catch (e) {
          console.warn("Failed to remove layer for " + id + ":", e);
        }
        productLayersRef.current.delete(id);
        useArchiveProductStore.getState().setProductLoading(baseId, false);
      }
    }

    if (!visibleProducts.length) {
      lastVisibleProductIdsRef.current = "";
      for (const controller of productAbortControllersRef.current.values()) {
        try {
          controller.abort();
        } catch { }
      }
      productAbortControllersRef.current.clear();
      for (const [id, layer] of productLayersRef.current.entries()) {
        try {
          const source = (layer as any).getSource?.();
          if (source?.clear) source.clear();
          map.removeLayer(layer);
          if ((layer as any).dispose) (layer as any).dispose();
        } catch { }
      }
      productLayersRef.current.clear();
      return;
    }

    const currentIds = visibleProducts
      .map((p) => p.id)
      .sort()
      .join(",");

    lastVisibleProductIdsRef.current = currentIds;

    // Helper: Style used for clipping mask canvas composite operation
    const clipMaskStyle = new Style({
      fill: new Fill({
        color: "#000000",
      }),
    });

    // Helper: Clip layer to target geometry using OpenLayers postrender
    const applyClippingToLayer = (layer: BaseLayer, clipGeom: any) => {
      if (!clipGeom) return;
      const clipFeature = new Feature(clipGeom);

      layer.on("postrender", (event: any) => {
        const ctx = event.context;
        if (!ctx) return;
        const vectorContext = getVectorContext(event);
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        vectorContext.drawFeature(clipFeature, clipMaskStyle);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      });
    };

    // Helper: Get active selected AOI geometry
    const getActiveAoiGeometry = () => {
      let target = layers.find((l) => l.id === selectedAOIId);
      if (!target) {
        target = layers.find((l) =>
          ["Polygon", "Box", "Coordinates", "Bound Coordinates"].includes(l.type)
        );
      }
      if (!target?.geojson) return null;
      const raw = target.geojson;
      if (raw.type === "Feature") return raw.geometry;
      if (raw.geometry) return raw.geometry;
      if (raw.type === "Polygon" || raw.type === "MultiPolygon") return raw;
      return null;
    };

    // Helper: Extract common area (intersection) between selected AOI and product footprint
    const getCommonIntersection = (aoiGeomJson: any, productGeom: any) => {
      if (!aoiGeomJson || !productGeom) return null;
      try {
        const format = new GeoJSON();
        const aoiFeature = format.readFeature({
          type: "Feature",
          geometry: aoiGeomJson,
        });
        const prodFeature = format.readFeature({
          type: "Feature",
          geometry: productGeom,
        });

        const aoiGeo = format.writeFeatureObject(aoiFeature as any);
        const prodGeo = format.writeFeatureObject(prodFeature as any);

        const intersection = turf.intersect(
          turf.featureCollection([aoiGeo, prodGeo] as any)
        );

        if (intersection && intersection.geometry) {
          return format.readGeometry(intersection.geometry);
        }
      } catch (err) {
        console.warn("Intersection calculation error:", err);
      }
      return null;
    };

    /**
     * Load Product on Map:
     * 1. Extracts the common area of the selected AOI and the product image boundary.
     * 2. Renders the clipped base image immediately (<100ms) so the image never fails to appear or disappears on zoom out.
     * 3. Asynchronously fetches WMTS/WMS tiles (cancellable via AbortController) and overlays them on top.
     */
    const loadProductOnMap = async (
      product: SelectedArchiveProduct,
      geometry: any
    ) => {
      console.log("loadProductOnMap:", product);

      // Abort any existing controller for this product
      const existingCtrl = productAbortControllersRef.current.get(product.id);
      if (existingCtrl) {
        try {
          existingCtrl.abort();
        } catch { }
      }
      const controller = new AbortController();
      productAbortControllersRef.current.set(product.id, controller);
      const signal = controller.signal;

      // Extract common area between selected AOI and product footprint
      const aoiGeomJson = getActiveAoiGeometry();
      const productGeomJson = product.geometry;
      const commonGeometry = getCommonIntersection(aoiGeomJson, productGeomJson);

      // Geometry to clip WMTS tiles: common intersection area if AOI exists, otherwise full product geometry
      const targetClipGeom = commonGeometry || geometry;

      // Helper: Render uncropped static imageUrl as fallback
      const renderImageUrl = () => {
        if (!product.imageUrl || !mapInstance.current || signal.aborted) return;
        const isStillVisible = useArchiveProductStore
          .getState()
          .visibleProducts.some((p) => p.id === product.id);
        if (!isStillVisible) return;

        if (
          productLayersRef.current.has(`${product.id}_static`) ||
          productLayersRef.current.has(`${product.id}_wmts`)
        ) {
          return;
        }

        const staticLayer = new ImageLayer({
          source: new ImageStatic({
            url: product.imageUrl,
            imageExtent: geometry.getExtent(),
            projection: "EPSG:4326",
          }),
          opacity: 1,
          zIndex: 20,
        });

        // Do NOT crop imageUrl - render directly on map
        mapInstance.current.addLayer(staticLayer);
        productLayersRef.current.set(`${product.id}_static`, staticLayer);
      };

      let wmtsLoaded = false;

      // 1. If WMTS/WMS is available, render ONLY WMTS file (clipped to common area)
      if (product.wmts_url) {
        useArchiveProductStore.getState().setProductLoading(product.id, true);
        try {
          const response = await fetch(product.wmts_url, { signal });
          if (signal.aborted) return;

          if (response.ok) {
            const text = await response.text();
            if (signal.aborted) return;

            // Check WMTS capabilities
            if (
              text.includes("<WMTS_Capabilities") ||
              (text.includes("<Capabilities") && !text.includes("<WMS_Capabilities"))
            ) {
              const parser = new WMTSCapabilities();
              const result = parser.read(text);
              const layerObj = result?.Contents?.Layer?.[0];
              const layerId = layerObj?.Identifier;

              const linkedMatrixSets: string[] =
                layerObj?.TileMatrixSetLink?.map((link: any) => link?.TileMatrixSet) || [];

              const matrixSet =
                linkedMatrixSets.find((ms) => ms === "EPSG:4326" || ms.includes("4326")) ||
                linkedMatrixSets.find((ms) => ms === "EPSG:3857" || ms.includes("3857")) ||
                linkedMatrixSets[0] ||
                result?.Contents?.TileMatrixSet?.[0]?.Identifier ||
                "EPSG:3857";

              if (layerId) {
                const options = optionsFromCapabilities(result, {
                  layer: layerId,
                  matrixSet: matrixSet,
                  projection: "EPSG:4326",
                  crossOrigin: "anonymous",
                });

                if (options && mapInstance.current && !signal.aborted) {
                  const isStillVisible = useArchiveProductStore
                    .getState()
                    .visibleProducts.some((p) => p.id === product.id);

                  if (isStillVisible && !productLayersRef.current.has(`${product.id}_wmts`)) {
                    const wmtsLayer = new TileLayer({
                      className: `ol-clipped-wmts-${product.id}`,
                      source: new WMTS({
                        ...options,
                        crossOrigin: "anonymous",
                        cacheSize: 4096,
                      }),
                      preload: 0,
                      opacity: 1,
                      zIndex: 21,
                    });

                    // Crop ONLY WMTS to the common area
                    if (targetClipGeom) {
                      applyClippingToLayer(wmtsLayer, targetClipGeom);
                    }

                    // If static preview layer exists, remove it so only WMTS remains
                    const existingStatic = productLayersRef.current.get(`${product.id}_static`);
                    if (existingStatic) {
                      mapInstance.current.removeLayer(existingStatic);
                      if ((existingStatic as any).dispose) (existingStatic as any).dispose();
                      productLayersRef.current.delete(`${product.id}_static`);
                    }

                    mapInstance.current.addLayer(wmtsLayer);
                    productLayersRef.current.set(`${product.id}_wmts`, wmtsLayer);
                    wmtsLoaded = true;

                    wmtsLayer.getSource()?.on("tileloadend", () => {
                      useArchiveProductStore.getState().setProductLoading(product.id, false);
                    });
                    wmtsLayer.getSource()?.on("tileloaderror", () => {
                      useArchiveProductStore.getState().setProductLoading(product.id, false);
                    });
                  }
                }
              }
            }
            // Check WMS capabilities
            else if (text.includes("<WMS_Capabilities") || text.includes("<Name>WMS</Name>")) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(text, "text/xml");

              const layerNames = Array.from(xmlDoc.querySelectorAll("Layer > Name"))
                .map((el) => el.textContent?.trim())
                .filter(Boolean) as string[];

              const selectedLayer =
                layerNames.find((n) => n === "layer_0") ||
                layerNames.find((n) => n !== "IDP_DAAS_Visualization") ||
                layerNames[0] ||
                "IDP_DAAS_Visualization";

              const onlineResource =
                xmlDoc.querySelector("GetMap OnlineResource")?.getAttribute("xlink:href") ||
                product.wms_url ||
                product.wmts_url.replace(/\/wmts\//, "/wms/");

              const wmsUrl = onlineResource.split("?")[0];

              if (mapInstance.current && !signal.aborted) {
                const isStillVisible = useArchiveProductStore
                  .getState()
                  .visibleProducts.some((p) => p.id === product.id);

                if (isStillVisible && !productLayersRef.current.has(`${product.id}_wmts`)) {
                  const wmsLayer = new ImageLayer({
                    className: `ol-clipped-wms-${product.id}`,
                    source: new ImageWMS({
                      url: wmsUrl,
                      params: {
                        LAYERS: selectedLayer,
                        FORMAT: "image/png",
                        TRANSPARENT: true,
                        VERSION: "1.3.0",
                      },
                      serverType: "mapserver",
                      crossOrigin: "anonymous",
                      ratio: 1,
                    }),
                    opacity: 0.9,
                    zIndex: 21,
                  });

                  // Crop ONLY WMS to the common area
                  if (targetClipGeom) {
                    applyClippingToLayer(wmsLayer, targetClipGeom);
                  }

                  // If static preview layer exists, remove it so only WMTS/WMS remains
                  const existingStatic = productLayersRef.current.get(`${product.id}_static`);
                  if (existingStatic) {
                    mapInstance.current.removeLayer(existingStatic);
                    if ((existingStatic as any).dispose) (existingStatic as any).dispose();
                    productLayersRef.current.delete(`${product.id}_static`);
                  }

                  mapInstance.current.addLayer(wmsLayer);
                  productLayersRef.current.set(`${product.id}_wmts`, wmsLayer);
                  wmtsLoaded = true;

                  wmsLayer.getSource()?.once("imageloadend", () => {
                    useArchiveProductStore.getState().setProductLoading(product.id, false);
                  });
                  wmsLayer.getSource()?.once("imageloaderror", () => {
                    useArchiveProductStore.getState().setProductLoading(product.id, false);
                  });
                }
              }
            }
          }
        } catch (err: any) {
          if (err?.name === "AbortError" || signal.aborted) {
            // Unselected by user, cleanly exit
            return;
          }
          console.warn("WMTS load failed for " + product.id, err);
        } finally {
          useArchiveProductStore.getState().setProductLoading(product.id, false);
        }
      }

      // 2. If WMTS is NOT available or failed (e.g. 403 Forbidden), fallback to uncropped imageUrl
      if (!wmtsLoaded) {
        renderImageUrl();
        useArchiveProductStore.getState().setProductLoading(product.id, false);
      }
    };

    // Load newly visible products that don't have a map layer yet
    const productsToLoad = visibleProducts.filter(
      (product) =>
        !productLayersRef.current.has(product.id) &&
        !productLayersRef.current.has(`${product.id}_static`) &&
        !productLayersRef.current.has(`${product.id}_wmts`)
    );

    if (productsToLoad.length > 0) {
      for (const product of productsToLoad) {
        if (!product?.geometry) {
          useArchiveProductStore.getState().setProductLoading(product.id, false);
          continue;
        }

        try {
          const feature = new GeoJSON().readFeature({
            type: "Feature",
            geometry: product.geometry,
          });
          const geometry = (feature as any)?.getGeometry?.();
          if (!geometry) {
            useArchiveProductStore.getState().setProductLoading(product.id, false);
            continue;
          }

          loadProductOnMap(product, geometry);
        } catch (err) {
          console.error("Error loading product layer " + product.id, err);
          useArchiveProductStore.getState().setProductLoading(product.id, false);
        }
      }

      // Ensure vector overlays (AOI polygons, markers) stay on top of imagery
      if (mapInstance.current) {
        mapInstance.current.getLayers().forEach((layer) => {
          if (layer instanceof VectorLayer) {
            layer.setZIndex(1000);
          }
        });
      }
    }
  }, [visibleProducts, setMaxZoom, layers, selectedAOIId]);

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
    const targetZoom = 18;
    map.getView().fit(geometry.getExtent(), {
      padding: [40, 40, 40, 40],
      duration: 800,
      // maxZoom: isSpecialCategoryUser ? UNRESTRICTED_MAX_ZOOM : targetZoom,
      maxZoom: targetZoom,
      callback: () => {
        setFlyToProduct(null);
      },
    });
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
        }),
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
      try {
        if (!aoiLayer?.geojson) return;
        const aoiFeature = format.readFeature(aoiLayer.geojson);
        const aoiGeo = format.writeFeatureObject(aoiFeature as any);

        // AOI ∩ Image footprint
        const intersection = turf.intersect(turf.featureCollection([aoiGeo, productGeo] as any));
        if (intersection) {
          const commonFeature = format.readFeature(intersection);

          (commonFeature as any).setStyle(
            new Style({
              fill: new Fill({
                color: "rgba(218, 198, 130, 0.50)",
              }),
              stroke: new Stroke({
                color: "rgba(115, 72, 30, 0.9)",
                width: 1.5,
              }),
            }),
          );

          hoverSource.addFeature(commonFeature as any);
        }
      } catch (err) {
        // Ignore invalid geometry intersections on hover
      }
    });

    return () => {
      hoverSource.clear();
    };
  }, [hoveredProduct, layers]);

  useEffect(() => {
    const source = pinSourceRef.current;

    if (!source) return;

    source.clear();

    if (pinnedProducts.length === 0) return;

    const format = new GeoJSON();

    const aoiLayers = layers.filter((layer) =>
      ["Polygon", "Box", "Point", "Coordinates", "Bound Coordinates"].includes(
        layer.type,
      ),
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

        const intersection = turf.intersect(
          turf.featureCollection([aoiGeo, productGeo] as any),
        );

        if (intersection) {
          const feature = format.readFeature(intersection);

          (feature as any).set("productId", product.id);

          (feature as any).setStyle(
            new Style({
              fill: new Fill({
                // Very subtle fill like the uploaded image
                color: "rgba(255, 204, 128, 0.12)",
              }),
              stroke: new Stroke({
                // Thin orange/red product boundary
                color: "#ff6f00",
                width: 1,
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

    view.setMaxZoom(isSpecialCategoryUser ? UNRESTRICTED_MAX_ZOOM : maxZoom);
  }, [maxZoom, isSpecialCategoryUser]);

  useEffect(() => {
    if (isSpecialCategoryUser) {
      setMaxZoom(UNRESTRICTED_MAX_ZOOM);
      const map = mapInstance.current;
      if (map) {
        map.getView().setMaxZoom(UNRESTRICTED_MAX_ZOOM);
      }
    }
  }, [isSpecialCategoryUser, setMaxZoom]);

  const prevAoiCountRef = useRef(0);

  useEffect(() => {
    const aoiTypes = ["Polygon", "Box", "Point", "Coordinates", "Bound Coordinates"];
    const aoiLayers = layers.filter(
      (layer) => aoiTypes.includes(layer.type) && !layer.label.startsWith("Orbit:"),
    );

    // Only auto-select if a new drawn layer has been added (count increased)
    if (aoiLayers.length > prevAoiCountRef.current) {
      const latestAOI = aoiLayers[aoiLayers.length - 1];
      setSelectedAOI(latestAOI.id);
    }

    prevAoiCountRef.current = aoiLayers.length;
  }, [layers, setSelectedAOI]);

  // Keep a ref of the selected AOI id in sync so the style function (which runs
  // outside React's render cycle) can read it, and re-style the layer on change.
  useEffect(() => {
    selectedAOIIdRef.current = selectedAOIId;
    vectorSourceRef.current?.changed();
  }, [selectedAOIId]);

  // Click on any AOI shape on the map to select it — this is what drives the
  // Archive Search panel, which already reacts to selectedAOIId changing.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const handleMapClick = (evt: any) => {
      if (activeTool) return; // don't hijack clicks while a draw tool is active
      if (evt.dragging) return; // ignore the click OL fires at the end of a drag

      const vectorLayer = vectorLayerRef.current;
      if (!vectorLayer) return;

      let clickedId: string | null = null;
      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature: any) => {
          const id = feature.getId();
          if (id != null) {
            clickedId = String(id);
            return true; // stop at the first (topmost) match
          }
          return false;
        },
        {
          layerFilter: (layer: any) => layer === vectorLayer,
          hitTolerance: 5,
        },
      );

      setSelectedAOI(clickedId);
    };

    map.on("click", handleMapClick);

    return () => {
      map.un("click", handleMapClick);
    };
  }, [activeTool, setSelectedAOI]);

  // Automatically zoom map to selected AOI shape when drawn, imported, or selected from list.
  // Deliberately keyed on the specific selected layer's object reference (not the whole
  // `layers` array) — addLayer/removeLayer only replace the array, not unrelated layer
  // objects, so toggling an orbitography checkbox (which just adds/removes swath & track
  // layers) won't re-trigger this fit. It only re-fires when the selection changes or the
  // selected AOI's own geometry is edited.
  const selectedAOIMapLayer = layers.find((l) => l.id === selectedAOIId);

  useEffect(() => {
    if (!selectedAOIId || !mapInstance.current) return;
    const selectedLayer = selectedAOIMapLayer;
    if (selectedLayer && selectedLayer.geojson) {
      try {
        const geojsonFormat = new GeoJSON();
        const feature = geojsonFormat.readFeature(selectedLayer.geojson);
        const geometry = feature.getGeometry();
        if (geometry) {
          const map = mapInstance.current;
          const area = selectedLayer.area ?? (getArea(geometry, { projection: "EPSG:4326" }) / 1000000);
          map.getView().fit(geometry, getAoiFitOptions(area));
        }
      } catch (err) {
        console.error("Failed to zoom to selected AOI:", err);
      }
    }
  }, [selectedAOIId, selectedAOIMapLayer]);

  useRasterLayers(mapState);
  return <div className="h-full w-full" ref={mapRef} id="map-container" />;
}