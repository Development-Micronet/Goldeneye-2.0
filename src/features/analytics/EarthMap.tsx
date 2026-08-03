/**
 * EarthMap — a professional GIS viewer on MapLibre GL JS.
 *
 * Grown from the original globe component: the projection, atmosphere and the
 * Esri imagery source are still here, now surrounded by a layer manager,
 * catalog, draw/measure tools and an instrument rail.
 *
 * Architecture
 *   state  → hooks/*      (map instance, layers, draw, geolocation, search)
 *   logic  → lib/*        (geodesy, style building, service URLs, fetching)
 *   config → constants/*  (basemaps, catalog)
 *   view   → ui/*         (panels and floating chrome)
 * This file only wires them together.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./css/earthmap.css";

import type { LayerDef, ProjectionMode, SearchResult } from "./types/types";
import { BASEMAPS, BUILDINGS_SOURCE, DEFAULT_BASEMAP_ID, getBasemap } from "./constants/basemaps";
import { DEFAULT_GEOJSON_STYLE } from "./constants/catalog";
import { readGeoJSONFile } from "./lib/data";
import { geojsonBounds } from "./lib/geo";
import { raiseToTop, uid } from "./lib/mapHelpers";

import { useMapInstance, useTerrain } from "./hooks/useMapInstance";
import { useLayers } from "./hooks/useLayers";
import { DRAW_LAYER_IDS, useDraw } from "./hooks/useDraw";
import { GEO_LAYER_IDS, useGeolocation } from "./hooks/useGeolocation";
import { useMapStatus, useSearch } from "./hooks/useMapStatus";
import { useInfoPopup } from "./hooks/useInfoPopup";

import { BasemapGallery } from "./ui/BasemapGallery";
import { LayerPanel } from "./ui/LayerPanel";
import { CatalogPanel } from "./ui/CatalogPanel";
import { AddLayerPanel } from "./ui/AddLayerPanel";
import { ToolsPanel } from "./ui/ToolsPanel";
import { SearchBar, StatusRail, Toolbar } from "./ui/MapChrome";
import { Icon } from "./Icons/Icons";

const HOME_VIEW = { center: [0, 20] as [number, number], zoom: 1.6, bearing: 0, pitch: 0 };

const SIDEBAR_TABS = [
  { id: "layers", label: "Layers" },
  { id: "catalog", label: "Catalog" },
  { id: "add", label: "Add" },
  { id: "basemap", label: "Base" },
  { id: "tools", label: "Tools" },
] as const;

type TabId = (typeof SIDEBAR_TABS)[number]["id"];

export interface EarthMapProps {
  initialBasemapId?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function EarthMap({
  initialBasemapId = DEFAULT_BASEMAP_ID,
  initialCenter = HOME_VIEW.center,
  initialZoom = HOME_VIEW.zoom,
}: EarthMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  /* ------------------------------------------------------------- view state */
  const [basemapId, setBasemapId] = useState(initialBasemapId);
  const [projection, setProjection] = useState<ProjectionMode>("globe");
  const [coordFormat, setCoordFormat] = useState<"dd" | "dms">("dd");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<TabId>("layers");
  const [terrain, setTerrain] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.4);
  const [buildings, setBuildings] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "info" | "error" } | null>(null);

  const basemap = useMemo(() => getBasemap(basemapId), [basemapId]);

  /* ------------------------------------------------------------------ hooks */
  const { map, styleEpoch } = useMapInstance({
    container: mapContainer,
    basemap,
    projection,
    center: initialCenter,
    zoom: initialZoom,
  });

  useTerrain(map, styleEpoch, { enabled: terrain, exaggeration });

  const layers = useLayers(map, styleEpoch);
  const draw = useDraw(map, styleEpoch);
  const geolocation = useGeolocation(map, styleEpoch);
  const status = useMapStatus(map);
  const search = useSearch();

  // The identify popup would swallow clicks meant for the draw tools.
  useInfoPopup(map, draw.mode === "idle");

  /* --------------------------------------------------------------- toasts */
  const notify = useCallback((text: string, tone: "info" | "error" = "info") => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ------------------------------------------------- keep tool layers on top */
  useEffect(() => {
    if (!map || !styleEpoch) return;
    raiseToTop(map, [...GEO_LAYER_IDS, ...DRAW_LAYER_IDS]);
  }, [map, styleEpoch, layers.layers, buildings]);

  /* ----------------------------------------------------------- 3D buildings */
  useEffect(() => {
    if (!map || !styleEpoch) return;
    const sourceId = "buildings-source";
    const layerId = "buildings-3d";

    if (buildings) {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "vector",
          url: BUILDINGS_SOURCE.url,
          attribution: BUILDINGS_SOURCE.attribution,
        });
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "fill-extrusion",
          source: sourceId,
          "source-layer": BUILDINGS_SOURCE.sourceLayer,
          minzoom: 13,
          paint: {
            // Colour ramps with height so cities read as terrain from above.
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "render_height"], 6],
              0, "#33414f",
              40, "#5c7181",
              150, "#c3d4e2",
            ],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.92,
          },
        });
      }
    } else if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [map, styleEpoch, buildings]);

  /* ------------------------------------------------------------- camera ops */
  const goHome = useCallback(() => {
    map?.flyTo({ ...HOME_VIEW, duration: 1400 });
  }, [map]);

  const resetNorth = useCallback(() => {
    map?.easeTo({ bearing: 0, pitch: 0, duration: 600 });
  }, [map]);

  const getBounds = useCallback((): [number, number, number, number] | undefined => {
    if (!map) return undefined;
    const bounds = map.getBounds();
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  }, [map]);

  const flyToResult = useCallback(
    (result: SearchResult) => {
      if (!map) return;
      if (result.bounds) map.fitBounds(result.bounds, { padding: 80, maxZoom: 16, duration: 1200 });
      else map.flyTo({ center: [result.lng, result.lat], zoom: 13, duration: 1200 });
      search.clear();
    },
    [map, search],
  );

  const flyToCoordinate = useCallback(
    (lng: number, lat: number) => {
      map?.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12), duration: 1200 });
      search.clear();
    },
    [map, search],
  );

  /* --------------------------------------------------- drag & drop GeoJSON */
  const addGeoJSONFile = useCallback(
    async (file: File) => {
      try {
        const data = await readGeoJSONFile(file);
        const bounds = geojsonBounds(data);
        const def: LayerDef = {
          id: uid("geojson"),
          name: file.name.replace(/\.(geo)?json$/i, ""),
          kind: "geojson",
          visible: true,
          opacity: 1,
          rev: 1,
          data,
          cluster: false,
          style: DEFAULT_GEOJSON_STYLE,
          bounds: bounds ?? undefined,
          metadata: {
            provider: "Dropped file",
            extra: { File: file.name, Features: String(data.features.length) },
          },
        };
        layers.addLayer(def);
        setTab("layers");
        notify(`${file.name}: ${data.features.length} features added.`);
        if (bounds) {
          map?.fitBounds(
            [
              [bounds[0], bounds[1]],
              [bounds[2], bounds[3]],
            ],
            { padding: 80, duration: 900, maxZoom: 14 },
          );
        }
      } catch (error) {
        notify((error as Error).message, "error");
      }
    },
    [layers, map, notify],
  );

  const exportDrawings = useCallback(() => {
    const blob = new Blob([JSON.stringify(draw.toGeoJSON(), null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "earthmap-drawings.geojson";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [draw]);

  /* -------------------------------------------------------------- rendering */
  return (
    <div
      className="em-root"
      onDragOver={(event) => {
        event.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void addGeoJSONFile(file);
      }}
    >
      {/* ------------------------------------------------------- sidebar */}
      <aside className="em-sidebar" data-collapsed={!sidebarOpen}>
        <div className="em-brand">
          <h1>EarthMap</h1>
          <span>GIS viewer</span>
          <button
            type="button"
            className="em-icon"
            style={{ marginLeft: "auto" }}
            aria-label="Collapse sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <Icon name="chevron-left" />
          </button>
        </div>

        <nav className="em-tabs" role="tablist">
          {SIDEBAR_TABS.map((item) => (
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
        </nav>

        <div className="em-scroll">
          {tab === "layers" && (
            <LayerPanel
              layers={layers.layers}
              onToggle={layers.toggleVisibility}
              onOpacity={layers.setOpacity}
              onRemove={layers.removeLayer}
              onZoom={layers.zoomToLayer}
              onMove={layers.moveLayer}
              onClear={layers.clearLayers}
            />
          )}

          {tab === "catalog" && (
            <CatalogPanel
              getBounds={getBounds}
              onAdd={(layer) => {
                layers.addLayer(layer);
                setTab("layers");
                notify(`${layer.name} added.`);
              }}
              onError={(message) => notify(message, "error")}
            />
          )}

          {tab === "add" && (
            <AddLayerPanel
              onAdd={(layer) => {
                layers.addLayer(layer);
                setTab("layers");
                notify(`${layer.name} added.`);
              }}
              onError={(message) => notify(message, "error")}
              onNotice={(message) => notify(message)}
            />
          )}

          {tab === "basemap" && <BasemapGallery activeId={basemapId} onSelect={setBasemapId} />}

          {tab === "tools" && (
            <ToolsPanel
              projection={projection}
              onProjection={setProjection}
              terrain={terrain}
              onTerrain={setTerrain}
              exaggeration={exaggeration}
              onExaggeration={setExaggeration}
              buildings={buildings}
              onBuildings={setBuildings}
              geolocation={geolocation}
              features={draw.features}
              selectedId={draw.selectedId}
              onSelectFeature={(fid) => {
                draw.selectFeature(fid);
                if (fid) draw.setMode("select");
              }}
              onZoomFeature={draw.zoomToFeature}
              onDeleteFeature={draw.deleteFeature}
              onClearFeatures={draw.clearAll}
              onExportFeatures={exportDrawings}
            />
          )}
        </div>
      </aside>

      {/* ----------------------------------------------------------- map */}
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div ref={mapContainer} className="em-map" />

        {!sidebarOpen ? (
          <button
            type="button"
            className="em-btn em-sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="layers" size={14} /> Panels
          </button>
        ) : null}

        <div className="em-float em-float--tl" style={{ top: sidebarOpen ? undefined : 52 }}>
          <Toolbar
            mode={draw.mode}
            onMode={draw.setMode}
            onHome={goHome}
            onResetNorth={resetNorth}
            onLocate={geolocation.locateOnce}
            locating={geolocation.tracking}
          />
        </div>

        <div className="em-float em-float--tc">
          <SearchBar
            query={search.query}
            onQuery={search.setQuery}
            results={search.results}
            loading={search.loading}
            error={search.error}
            coordinateHit={search.coordinateHit}
            onPick={flyToResult}
            onCoordinate={flyToCoordinate}
            onClear={search.clear}
          />
        </div>

        {dropActive ? <div className="em-drop-overlay">Drop a GeoJSON file to add it as a layer</div> : null}

        {toast ? (
          <div className="em-toast" data-tone={toast.tone} role="alert">
            {toast.text}
          </div>
        ) : null}
      </div>

      {/* -------------------------------------------------- instrument rail */}
      <StatusRail
        status={status}
        projection={projection}
        mode={draw.mode}
        coordFormat={coordFormat}
        onCoordFormat={setCoordFormat}
        onZoom={(zoom) => map?.zoomTo(zoom, { duration: 120 })}
      />
    </div>
  );
}

/** Named export kept for convenience alongside the default. */
export { BASEMAPS };