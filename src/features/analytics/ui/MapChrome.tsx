/**
 * Chrome that floats over the map: the draw/measure toolbar, the Nominatim
 * search box, and the instrument rail along the bottom edge.
 */
import { useEffect, useState } from "react";
import type { DrawMode, MapStatus, ProjectionMode, SearchResult } from "../types/types";
import { formatDegrees, niceScale, toDMS } from "../lib/geo";
import { Icon, type IconName } from "./../Icons/Icons";

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

const DRAW_TOOLS: { mode: DrawMode; icon: IconName; label: string }[] = [
    { mode: "select", icon: "pointer", label: "Select, move and edit" },
    { mode: "point", icon: "point", label: "Draw point" },
    { mode: "line", icon: "line", label: "Draw line" },
    { mode: "polygon", icon: "polygon", label: "Draw polygon" },
    { mode: "rectangle", icon: "square", label: "Draw rectangle (drag)" },
    { mode: "circle", icon: "circle", label: "Draw circle (click centre, then edge)" },
];

const MEASURE_TOOLS: { mode: DrawMode; icon: IconName; label: string }[] = [
    { mode: "measure-distance", icon: "ruler", label: "Measure distance" },
    { mode: "measure-area", icon: "polygon", label: "Measure area" },
    { mode: "measure-bearing", icon: "north", label: "Measure bearing" },
];

export interface ToolbarProps {
    mode: DrawMode;
    onMode: (mode: DrawMode) => void;
    onHome: () => void;
    onResetNorth: () => void;
    onLocate: () => void;
    locating: boolean;
}

export function Toolbar({ mode, onMode, onHome, onResetNorth, onLocate, locating }: ToolbarProps) {
    const button = (
        tool: { mode: DrawMode; icon: IconName; label: string },
        armed = false,
    ) => (
        <button
            key={tool.mode}
            type="button"
            className="em-tool"
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={mode === tool.mode}
            data-active={!armed && mode === tool.mode}
            data-armed={armed && mode === tool.mode}
            onClick={() => onMode(tool.mode)}
        >
            <Icon name={tool.icon} />
        </button>
    );

    return (
        <div className="em-toolbar" role="toolbar" aria-label="Drawing and measurement">
            {DRAW_TOOLS.map((tool) => button(tool))}
            <hr />
            {MEASURE_TOOLS.map((tool) => button(tool, true))}
            <hr />
            <button type="button" className="em-tool" title="Home view" onClick={onHome}>
                <Icon name="home" />
            </button>
            <button type="button" className="em-tool" title="Reset north" onClick={onResetNorth}>
                <Icon name="north" />
            </button>
            <button
                type="button"
                className="em-tool"
                title="Locate me"
                data-active={locating}
                onClick={onLocate}
            >
                <Icon name="locate" />
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchBarProps {
    query: string;
    onQuery: (value: string) => void;
    results: SearchResult[];
    loading: boolean;
    error: string | null;
    coordinateHit: { lng: number; lat: number } | null;
    onPick: (result: SearchResult) => void;
    onCoordinate: (lng: number, lat: number) => void;
    onClear: () => void;
}

export function SearchBar({
    query,
    onQuery,
    results,
    loading,
    error,
    coordinateHit,
    onPick,
    onCoordinate,
    onClear,
}: SearchBarProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(Boolean(query.trim()));
    }, [query]);

    return (
        <div className="em-search">
            <div className="em-search__input">
                <Icon name="search" size={15} />
                <input
                    value={query}
                    placeholder="Search a place, address or paste 21.15, 79.09"
                    aria-label="Search places"
                    onChange={(event) => onQuery(event.target.value)}
                    onFocus={() => setOpen(Boolean(query.trim()))}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            if (coordinateHit) onCoordinate(coordinateHit.lng, coordinateHit.lat);
                            else if (results[0]) onPick(results[0]);
                            setOpen(false);
                        }
                        if (event.key === "Escape") {
                            onClear();
                            setOpen(false);
                        }
                    }}
                />
                {loading ? <span className="em-spinner" /> : null}
                {query ? (
                    <button type="button" className="em-icon" aria-label="Clear search" onClick={onClear}>
                        <Icon name="close" size={14} />
                    </button>
                ) : null}
            </div>

            {open && (coordinateHit || results.length > 0 || error) ? (
                <div className="em-search__results">
                    {coordinateHit ? (
                        <button type="button" onClick={() => onCoordinate(coordinateHit.lng, coordinateHit.lat)}>
                            <b>
                                {formatDegrees(coordinateHit.lat)}, {formatDegrees(coordinateHit.lng)}
                            </b>
                            <small>Go to coordinates</small>
                        </button>
                    ) : null}

                    {results.map((result) => (
                        <button key={result.id} type="button" onClick={() => onPick(result)}>
                            <b>{result.label}</b>
                            <small>{result.category}</small>
                        </button>
                    ))}

                    {error ? (
                        <button type="button" disabled style={{ cursor: "default" }}>
                            <b>{error}</b>
                            <small>Nominatim</small>
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Instrument rail                                                     */
/* ------------------------------------------------------------------ */

export interface StatusRailProps {
    status: MapStatus;
    projection: ProjectionMode;
    mode: DrawMode;
    coordFormat: "dd" | "dms";
    onCoordFormat: (format: "dd" | "dms") => void;
    onZoom: (zoom: number) => void;
}

/** The signature readout: a GPS-style strip of live map instruments. */
export function StatusRail({
    status,
    projection,
    mode,
    coordFormat,
    onCoordFormat,
    onZoom,
}: StatusRailProps) {
    const scale = niceScale(90, status.resolution);
    const cursor = status.cursor;

    const coords = (lng: number, lat: number) =>
        coordFormat === "dd"
            ? `${formatDegrees(lat)}  ${formatDegrees(lng)}`
            : `${toDMS(lat, "lat")}  ${toDMS(lng, "lng")}`;

    return (
        <div className="em-rail" role="status" aria-live="off">
            <button
                type="button"
                className="em-rail__cell"
                style={{ background: "none", border: 0, borderRight: "1px solid var(--rule)", color: "inherit", font: "inherit", cursor: "pointer" }}
                title="Switch between decimal degrees and DMS"
                onClick={() => onCoordFormat(coordFormat === "dd" ? "dms" : "dd")}
            >
                <dfn>Cursor</dfn>
                <b>{cursor ? coords(cursor.lng, cursor.lat) : "— outside map —"}</b>
            </button>

            <div className="em-rail__cell">
                <dfn>Centre</dfn>
                <b>{coords(status.center.lng, status.center.lat)}</b>
            </div>

            <div className="em-rail__cell">
                <dfn>Zoom</dfn>
                <b>{status.zoom.toFixed(2)}</b>
                <input
                    className="em-range"
                    style={{ width: 84 }}
                    type="range"
                    min={0}
                    max={22}
                    step={0.1}
                    value={status.zoom}
                    aria-label="Zoom level"
                    onChange={(event) => onZoom(Number(event.target.value))}
                />
            </div>

            <div className="em-rail__cell">
                <dfn>Scale</dfn>
                <span className="em-rail__scalebar" style={{ width: Math.max(scale.px, 24) }} />
                <b>{scale.label}</b>
            </div>

            <div className="em-rail__cell">
                <dfn>Resolution</dfn>
                <b>{status.resolution < 1 ? `${(status.resolution * 100).toFixed(0)} cm/px` : `${status.resolution.toFixed(1)} m/px`}</b>
            </div>

            <div className="em-rail__cell">
                <dfn>Camera</dfn>
                <b>
                    {status.bearing.toFixed(0)}° / {status.pitch.toFixed(0)}°
                </b>
            </div>

            <div className="em-rail__cell">
                <dfn>Projection</dfn>
                <b>{projection === "globe" ? "Globe · WGS 84" : "Mercator · EPSG:3857"}</b>
            </div>

            <div className="em-rail__cell">
                <dfn>Mode</dfn>
                <b style={{ color: mode === "idle" ? undefined : "var(--amber)" }}>
                    {mode === "idle" ? "identify" : mode.replace("-", " ")}
                </b>
            </div>
        </div>
    );
}