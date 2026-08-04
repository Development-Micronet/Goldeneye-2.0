/**
 * View + tools panel: terrain, 3D buildings, projection, geolocation and the
 * list of everything drawn so far.
 */
import type { ProjectionMode } from "../types/types";
import type { DrawFeature } from "../hooks/useDraw";
import type { GeoFix } from "../hooks/useGeolocation";
import {
    formatArea,
    formatDegrees,
    formatDistance,
    lineLength,
    polygonArea,
} from "../lib/geo";
import { Icon } from "./../Icons/Icons";

export interface ToolsPanelProps {
    projection: ProjectionMode;
    onProjection: (mode: ProjectionMode) => void;

    terrain: boolean;
    onTerrain: (enabled: boolean) => void;
    exaggeration: number;
    onExaggeration: (value: number) => void;

    buildings: boolean;
    onBuildings: (enabled: boolean) => void;

    geolocation: {
        fix: GeoFix | null;
        tracking: boolean;
        follow: boolean;
        error: string | null;
        locateOnce: () => void;
        toggleTracking: () => void;
        toggleFollow: () => void;
    };

    features: DrawFeature[];
    selectedId: string | null;
    onSelectFeature: (fid: string | null) => void;
    onZoomFeature: (fid: string) => void;
    onDeleteFeature: (fid: string) => void;
    onClearFeatures: () => void;
    onExportFeatures: () => void;
}

/** One-line summary of a drawn feature: type plus its measurement. */
function describe(feature: DrawFeature): string {
    const geom = feature.geometry;
    if (geom.type === "Point") {
        return `${formatDegrees(geom.coordinates[1], 4)}, ${formatDegrees(geom.coordinates[0], 4)}`;
    }
    if (geom.type === "LineString") return formatDistance(lineLength(geom.coordinates));
    if (geom.type === "Polygon") return formatArea(polygonArea(geom.coordinates));
    return "—";
}

export function ToolsPanel(props: ToolsPanelProps) {
    const { geolocation: geo } = props;

    return (
        <>
            <section className="em-section">
                <h2>View</h2>

                <label className="em-field">
                    <span>Projection</span>
                    <select
                        className="em-select"
                        value={props.projection}
                        onChange={(event) => props.onProjection(event.target.value as ProjectionMode)}
                    >
                        <option value="globe">Globe (3D sphere)</option>
                        <option value="mercator">Web Mercator (EPSG:3857)</option>
                    </select>
                </label>

                <label className="em-check" style={{ marginBottom: 8 }}>
                    <input
                        type="checkbox"
                        checked={props.terrain}
                        onChange={(event) => props.onTerrain(event.target.checked)}
                    />
                    <Icon name="mountain" size={14} /> 3D terrain
                </label>

                {props.terrain ? (
                    <label className="em-layer__opacity" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 10, color: "var(--ink-dim)" }}>EXAG</span>
                        <input
                            className="em-range"
                            type="range"
                            min={0.5}
                            max={4}
                            step={0.1}
                            value={props.exaggeration}
                            onChange={(event) => props.onExaggeration(Number(event.target.value))}
                        />
                        <output>{props.exaggeration.toFixed(1)}×</output>
                    </label>
                ) : null}

                <label className="em-check">
                    <input
                        type="checkbox"
                        checked={props.buildings}
                        onChange={(event) => props.onBuildings(event.target.checked)}
                    />
                    <Icon name="building" size={14} /> 3D buildings (zoom 13+)
                </label>

                <p className="em-hint">
                    Terrain uses AWS Terrarium DEM tiles; buildings come from OpenFreeMap
                    vector tiles. Both are free and key-free.
                </p>
            </section>

            <section className="em-section">
                <h2>My location</h2>
                <div className="em-row" style={{ marginBottom: 8 }}>
                    <button type="button" className="em-btn" onClick={geo.locateOnce}>
                        <Icon name="locate" size={14} /> Locate
                    </button>
                    <button
                        type="button"
                        className="em-btn"
                        data-active={geo.tracking}
                        onClick={geo.toggleTracking}
                    >
                        {geo.tracking ? "Stop tracking" : "Track"}
                    </button>
                    <button
                        type="button"
                        className="em-btn"
                        data-active={geo.follow}
                        onClick={geo.toggleFollow}
                    >
                        Follow
                    </button>
                </div>

                {geo.fix ? (
                    <dl className="em-meta" style={{ borderTop: 0, paddingTop: 0 }}>
                        <dt>Position</dt>
                        <dd>
                            {formatDegrees(geo.fix.lat)}, {formatDegrees(geo.fix.lng)}
                        </dd>
                        <dt>Accuracy</dt>
                        <dd>± {formatDistance(geo.fix.accuracy)}</dd>
                        <dt>Fix time</dt>
                        <dd>{new Date(geo.fix.timestamp).toLocaleTimeString()}</dd>
                    </dl>
                ) : (
                    <p className="em-hint">No fix yet. Locate needs a secure (https) origin.</p>
                )}
                {geo.error ? (
                    <p className="em-hint" style={{ color: "var(--rose)" }}>
                        {geo.error}
                    </p>
                ) : null}
            </section>

            <section className="em-section">
                <h2>
                    Drawings <span className="em-tag">{props.features.length}</span>
                </h2>

                {props.features.length === 0 ? (
                    <p className="em-empty">
                        Pick a draw or measure tool from the toolbar. Enter finishes a shape,
                        Esc cancels, Delete removes the selection.
                    </p>
                ) : (
                    <>
                        {props.features.map((feature) => {
                            const fid = feature.properties.fid;
                            const selected = props.selectedId === fid;
                            return (
                                <article key={fid} className="em-layer">
                                    <header className="em-layer__head">
                                        <button
                                            type="button"
                                            className="em-icon"
                                            data-active={selected}
                                            aria-label="Select feature"
                                            onClick={() => props.onSelectFeature(selected ? null : fid)}
                                        >
                                            <Icon name="pointer" />
                                        </button>
                                        <span className="em-layer__title">
                                            <b>
                                                {feature.properties.shape}
                                                {feature.properties.measure ? " · measure" : ""}
                                            </b>
                                            <small>{describe(feature)}</small>
                                        </span>
                                        <button
                                            type="button"
                                            className="em-icon"
                                            aria-label="Zoom to feature"
                                            onClick={() => props.onZoomFeature(fid)}
                                        >
                                            <Icon name="target" />
                                        </button>
                                        <button
                                            type="button"
                                            className="em-icon em-icon--danger"
                                            aria-label="Delete feature"
                                            onClick={() => props.onDeleteFeature(fid)}
                                        >
                                            <Icon name="trash" />
                                        </button>
                                    </header>
                                </article>
                            );
                        })}

                        <div className="em-row">
                            <button type="button" className="em-btn" onClick={props.onExportFeatures}>
                                <Icon name="download" size={14} /> Export GeoJSON
                            </button>
                            <button
                                type="button"
                                className="em-btn em-btn--danger em-btn--ghost"
                                onClick={props.onClearFeatures}
                            >
                                Clear all
                            </button>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}