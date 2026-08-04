/**
 * Layer manager: visibility, opacity, zoom-to, remove, metadata and
 * drag-and-drop ordering (top of the list draws on top of the map).
 */
import { useState } from "react";
import type { ReactNode } from "react";
import type { LayerDef } from "../types/types";
import { Icon } from "./../Icons/Icons";

const KIND_LABEL: Record<LayerDef["kind"], string> = {
    raster: "XYZ raster",
    wms: "OGC WMS",
    wmts: "OGC WMTS",
    vector: "Vector tiles",
    geojson: "GeoJSON",
    image: "Image overlay",
};

export interface LayerPanelProps {
    layers: LayerDef[];
    onToggle: (id: string) => void;
    onOpacity: (id: string, opacity: number) => void;
    onRemove: (id: string) => void;
    onZoom: (id: string) => void;
    onMove: (from: number, to: number) => void;
    onClear: () => void;
}

export function LayerPanel({
    layers,
    onToggle,
    onOpacity,
    onRemove,
    onZoom,
    onMove,
    onClear,
}: LayerPanelProps) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const [openMeta, setOpenMeta] = useState<string | null>(null);

    return (
        <section className="em-section">
            <h2>
                Layers <span className="em-tag">{layers.length}</span>
            </h2>

            {layers.length === 0 ? (
                <p className="em-empty">
                    No layers yet. Add one from the catalog, paste a service URL, or drop a
                    GeoJSON file onto the map.
                </p>
            ) : (
                <>
                    {layers.map((layer, index) => {
                        const metaOpen = openMeta === layer.id;
                        return (
                            <article
                                key={layer.id}
                                className="em-layer"
                                draggable
                                data-dragging={dragIndex === index}
                                data-dropbefore={overIndex === index && dragIndex !== index}
                                onDragStart={(event) => {
                                    setDragIndex(index);
                                    event.dataTransfer.effectAllowed = "move";
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setOverIndex(index);
                                }}
                                onDragEnd={() => {
                                    setDragIndex(null);
                                    setOverIndex(null);
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    if (dragIndex !== null) onMove(dragIndex, index);
                                    setDragIndex(null);
                                    setOverIndex(null);
                                }}
                            >
                                <header className="em-layer__head">
                                    <span className="em-layer__grip" title="Drag to reorder">
                                        <Icon name="grip" size={14} />
                                    </span>

                                    <button
                                        type="button"
                                        className="em-icon"
                                        data-active={layer.visible}
                                        aria-label={layer.visible ? "Hide layer" : "Show layer"}
                                        onClick={() => onToggle(layer.id)}
                                    >
                                        <Icon name={layer.visible ? "eye" : "eye-off"} />
                                    </button>

                                    <span className="em-layer__title">
                                        <b title={layer.name}>{layer.name}</b>
                                        <small>{KIND_LABEL[layer.kind]}</small>
                                    </span>

                                    <button
                                        type="button"
                                        className="em-icon"
                                        aria-label="Zoom to layer"
                                        onClick={() => onZoom(layer.id)}
                                    >
                                        <Icon name="target" />
                                    </button>
                                    <button
                                        type="button"
                                        className="em-icon"
                                        data-active={metaOpen}
                                        aria-label="Layer details"
                                        onClick={() => setOpenMeta(metaOpen ? null : layer.id)}
                                    >
                                        <Icon name="info" />
                                    </button>
                                    <button
                                        type="button"
                                        className="em-icon em-icon--danger"
                                        aria-label="Remove layer"
                                        onClick={() => onRemove(layer.id)}
                                    >
                                        <Icon name="trash" />
                                    </button>
                                </header>

                                <div className="em-layer__body">
                                    <label className="em-layer__opacity">
                                        <Icon name="stack" size={13} />
                                        <input
                                            className="em-range"
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={layer.opacity}
                                            aria-label={`${layer.name} opacity`}
                                            onChange={(event) => onOpacity(layer.id, Number(event.target.value))}
                                        />
                                        <output>{Math.round(layer.opacity * 100)}%</output>
                                    </label>

                                    {metaOpen ? <LayerMetadata layer={layer} /> : null}
                                </div>
                            </article>
                        );
                    })}

                    <button type="button" className="em-btn em-btn--ghost em-btn--wide" onClick={onClear}>
                        Remove all layers
                    </button>
                </>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */

function LayerMetadata({ layer }: { layer: LayerDef }) {
    const meta = layer.metadata ?? {};
    const rows: [string, ReactNode][] = [
        ["Type", KIND_LABEL[layer.kind]],
        ["Provider", meta.provider ?? "—"],
        ["License", meta.license ?? "—"],
    ];

    if (layer.kind === "geojson") {
        rows.push(["Features", String(layer.data.features.length)]);
        rows.push(["Clustered", layer.cluster ? "yes" : "no"]);
    }
    if (layer.kind === "wms") {
        rows.push(["Service", `WMS ${layer.version}`]);
        rows.push(["Layers", layer.layers]);
    }
    if (layer.kind === "vector") {
        rows.push(["Style layers", String(layer.styleLayers.length)]);
    }
    if (layer.bounds) {
        rows.push(["Extent", layer.bounds.map((v) => v.toFixed(2)).join(", ")]);
    }
    Object.entries(meta.extra ?? {}).forEach(([key, value]) => rows.push([key, value]));
    if (meta.homepage) {
        rows.push([
            "Source",
            <a href={meta.homepage} target="_blank" rel="noreferrer">
                {new URL(meta.homepage).hostname}
            </a>,
        ]);
    }

    return (
        <dl className="em-meta">
            {rows.map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}