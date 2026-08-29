import { MercatorCoordinate } from "maplibre-gl";
import type {
  LngLatBounds,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  GeoJSONFeature,
  VectorTileSource,
} from "maplibre-gl";
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DEFAULT_FLOOR_HEIGHT, DEFAULT_HEIGHT, MIN_EXTRUSION } from "../constant/3Dconstant";

export type BuildingFeature = GeoJSONFeature | MapGeoJSONFeature | Feature<Geometry>;

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const match = value.match(/-?[\d.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseHexColorAndOpacity(inputColor: string): {
  color: string;
  opacity: number;
  transparent: boolean;
} {
  let colorStr = inputColor.trim();
  let opacity = 1.0;

  if (colorStr.startsWith("#") && colorStr.length === 9) {
    const hexColor = colorStr.slice(0, 7);
    const alphaHex = colorStr.slice(7, 9);
    const alphaVal = parseInt(alphaHex, 16);

    if (!isNaN(alphaVal)) {
      opacity = alphaVal / 255;
    }

    colorStr = hexColor;
  }

  return {
    color: colorStr,
    opacity,
    transparent: opacity < 1.0,
  };
}

export function getHeight(properties: Record<string, unknown>) {
  const rendered = toNumber(properties.render_height);
  if (rendered !== null && rendered > 0) return rendered;
  const height = toNumber(properties.height);
  if (height !== null && height > 0) return height;
  const levels = toNumber(properties.levels) ?? toNumber(properties["building:levels"]);
  if (levels !== null && levels > 0) {
    return levels * DEFAULT_FLOOR_HEIGHT;
  }
  return DEFAULT_HEIGHT;
}

export function getMinHeight(properties: Record<string, unknown>) {
  const rendered = toNumber(properties.render_min_height);
  if (rendered !== null && rendered > 0) return rendered;
  const minHeight = toNumber(properties.min_height);
  if (minHeight !== null && minHeight > 0) return minHeight;
  const minLevel = toNumber(properties.min_level) ?? toNumber(properties["building:min_level"]);
  if (minLevel !== null && minLevel > 0) {
    return minLevel * DEFAULT_FLOOR_HEIGHT;
  }
  return 0;
}

export function getProjectionMatrix(args: unknown): ArrayLike<number> | null {
  if (!args) return null;
  if (args instanceof Float32Array || args instanceof Float64Array || Array.isArray(args)) {
    return args;
  }
  const anyArgs = args as any;
  if (anyArgs.defaultProjectionData?.mainMatrix) {
    return anyArgs.defaultProjectionData.mainMatrix;
  }
  if (anyArgs.matrix) {
    return anyArgs.matrix;
  }
  if (anyArgs.projectionMatrix) {
    return anyArgs.projectionMatrix;
  }
  return null;
}

export function isExtrudable(
  feature: BuildingFeature,
): feature is BuildingFeature & { geometry: Polygon | MultiPolygon } {
  return feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";
}

export function polygonsOf(geometry: Polygon | MultiPolygon): Position[][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

export type Box = { west: number; south: number; east: number; north: number };

export function boundsOf(geometry: Polygon | MultiPolygon): Box {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const polygon of polygonsOf(geometry)) {
    for (const [lng, lat] of polygon[0] ?? []) {
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }

  return { west, south, east, north };
}

export function intersects(a: Box, b: Box) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

export function contains(outer: Box, inner: Box) {
  return (
    inner.west >= outer.west &&
    inner.east <= outer.east &&
    inner.south >= outer.south &&
    inner.north <= outer.north
  );
}

export function padBounds(bounds: LngLatBounds, factor: number): Box {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  const padX = (east - west) * factor;
  const padY = (north - south) * factor;

  return {
    west: west - padX,
    east: east + padX,
    south: south - padY,
    north: north + padY,
  };
}

export function toBox(bounds: LngLatBounds): Box {
  return {
    west: bounds.getWest(),
    east: bounds.getEast(),
    south: bounds.getSouth(),
    north: bounds.getNorth(),
  };
}

/*
 * Tile coordinates are quantised to the tile extent, so the same building
 * returns slightly different corners depending on which tile served it.
 * Five decimals (~1 m) is coarser than that quantisation, so a redraw
 * reuses the cached geometry instead of minting a near-duplicate.
 */
export function featureKey(feature: MapGeoJSONFeature, bbox: Box) {
  const id = feature.id ?? (feature.properties?.osm_id as string | number | undefined) ?? "anon";

  const round = (value: number) => value.toFixed(5);

  return `${id}:${round(bbox.west)},${round(bbox.south)},${round(bbox.east)},${round(bbox.north)}`;
}

export type Anchor = {
  mercator: MercatorCoordinate;
  /** Mercator units per metre at the anchor's latitude. */
  scale: number;
  lng: number;
  lat: number;
};

export function appendRing(target: THREE.Shape | THREE.Path, ring: Position[], anchor: Anchor) {
  const first = ring[0];
  const last = ring[ring.length - 1];

  const count =
    ring.length > 1 && first[0] === last[0] && first[1] === last[1] ? ring.length - 1 : ring.length;

  if (count < 3) return false;

  for (let i = 0; i < count; i++) {
    const mercator = MercatorCoordinate.fromLngLat([ring[i][0], ring[i][1]]);

    /*
     * Everything is expressed in metres from the shared anchor, which
     * is what lets separate buildings merge into one buffer. The local
     * frame stays aligned with MapLibre's mercator axes (X east,
     * Y south, Z up), a left-handed frame relative to Three - hence
     * DoubleSide on the material.
     */
    const x = (mercator.x - anchor.mercator.x) / anchor.scale;
    const y = (mercator.y - anchor.mercator.y) / anchor.scale;

    if (i === 0) {
      target.moveTo(x, y);
    } else {
      target.lineTo(x, y);
    }
  }

  target.closePath();
  return true;
}

/**
 * One BufferGeometry per building, already positioned in the anchor frame
 * so a batch can be merged without any per-mesh transform.
 */
export function createBuildingGeometry(
  feature: MapGeoJSONFeature & { geometry: Polygon | MultiPolygon },
  anchor: Anchor,
): THREE.BufferGeometry | null {
  const properties = feature.properties ?? {};
  const height = getHeight(properties);
  const minHeight = Math.min(getMinHeight(properties), height - MIN_EXTRUSION);
  const depth = Math.max(height - minHeight, MIN_EXTRUSION);

  const parts: THREE.BufferGeometry[] = [];

  for (const polygon of polygonsOf(feature.geometry)) {
    const outerRing = polygon[0];
    if (!outerRing || outerRing.length < 3) continue;

    const shape = new THREE.Shape();
    if (!appendRing(shape, outerRing, anchor)) continue;

    for (let i = 1; i < polygon.length; i++) {
      const hole = new THREE.Path();
      if (appendRing(hole, polygon[i], anchor)) {
        shape.holes.push(hole);
      }
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 1,
    });

    /* ExtrudeGeometry grows from z=0; lift buildings on stilts. */
    if (minHeight > 0) geometry.translate(0, 0, minHeight);

    /* UVs are dead weight for flat-coloured extrusions. */
    geometry.deleteAttribute("uv");

    parts.push(geometry);
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const merged = mergeGeometries(parts, false);

  parts.forEach((part) => part.dispose());

  return merged;
}

export function hasVectorLayer(map: MapLibreMap, sourceId: string, sourceLayer: string) {
  const source = map.getSource(sourceId) as
    (VectorTileSource & { vectorLayerIds?: string[] }) | undefined;

  if (!source || source.type !== "vector") return false;
  return !source.vectorLayerIds || source.vectorLayerIds.includes(sourceLayer);
}
