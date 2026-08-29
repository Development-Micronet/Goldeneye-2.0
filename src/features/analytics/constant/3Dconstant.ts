const LAYER_ID = "osm-3d-buildings";
const KEEPER_LAYER_ID = "osm-3d-buildings-tile-keeper";
const FALLBACK_SOURCE_ID = "osm-3d-buildings-source";
const FALLBACK_TILE_URL = "https://tiles.openfreemap.org/planet";

const DEFAULT_FLOOR_HEIGHT = 3;
const DEFAULT_HEIGHT = 10;
const MIN_EXTRUSION = 0.5;

const REBUILD_INTERVAL_MS = 250;

/*
 * Geometry is stored in metres relative to an anchor and uploaded as
 * float32. Re-anchoring is only needed once that offset grows large
 * enough to cost precision, which is far beyond any single viewport.
 */
const ANCHOR_RESET_METERS = 50_000;

/* Cached geometries unused for this many passes are eligible for pruning. */
const CACHE_GRACE_PASSES = 3;

export {
  LAYER_ID,
  KEEPER_LAYER_ID,
  FALLBACK_SOURCE_ID,
  FALLBACK_TILE_URL,
  DEFAULT_FLOOR_HEIGHT,
  DEFAULT_HEIGHT,
  MIN_EXTRUSION,
  REBUILD_INTERVAL_MS,
  ANCHOR_RESET_METERS,
  CACHE_GRACE_PASSES,
};
