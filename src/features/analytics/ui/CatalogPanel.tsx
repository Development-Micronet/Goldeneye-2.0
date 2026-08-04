/**
 * Public layer catalog. Entries that need a key or a network round-trip
 * resolve here, so the rest of the app only ever sees a finished LayerDef.
 */
import { useState } from "react";
import type { CatalogEntry, LayerDef } from "../types/types";
import { CATALOG, CATALOG_GROUPS } from "../constants/catalog";
import { Icon } from "./../Icons/Icons";

export interface CatalogPanelProps {
    /** Current viewport, forwarded to bbox-driven entries such as Overpass. */
    getBounds: () => [number, number, number, number] | undefined;
    onAdd: (layer: LayerDef) => void;
    onError: (message: string) => void;
}

export function CatalogPanel({ getBounds, onAdd, onError }: CatalogPanelProps) {
    const [busyId, setBusyId] = useState<string | null>(null);
    const [keyPrompt, setKeyPrompt] = useState<CatalogEntry | null>(null);
    const [keyValue, setKeyValue] = useState("");

    const run = async (entry: CatalogEntry, apiKey?: string) => {
        setBusyId(entry.id);
        try {
            onAdd(await entry.build({ apiKey, bounds: getBounds() }));
        } catch (error) {
            onError(`${entry.name}: ${(error as Error).message}`);
        } finally {
            setBusyId(null);
        }
    };

    const handleClick = (entry: CatalogEntry) => {
        if (entry.requiresKey) {
            setKeyValue("");
            setKeyPrompt(entry);
            return;
        }
        void run(entry);
    };

    return (
        <section className="em-section">
            <h2>Catalog</h2>
            <p className="em-hint" style={{ marginBottom: 12 }}>
                Public services, added with one click. Live feeds are fetched when you add
                them.
            </p>

            {CATALOG_GROUPS.map((group) => (
                <div className="em-catalog-group" key={group}>
                    <h3>{group}</h3>
                    {CATALOG.filter((entry) => entry.group === group).map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className="em-catalog-item"
                            disabled={busyId === entry.id}
                            onClick={() => handleClick(entry)}
                        >
                            <span style={{ flex: 1 }}>
                                <b>{entry.name}</b>
                                <p>{entry.blurb}</p>
                            </span>
                            {busyId === entry.id ? (
                                <span className="em-spinner" />
                            ) : (
                                <Icon name="plus" size={14} />
                            )}
                        </button>
                    ))}
                </div>
            ))}

            {keyPrompt ? (
                <div className="em-section" style={{ padding: 0, borderBottom: 0 }}>
                    <label className="em-field">
                        <span>{keyPrompt.keyLabel ?? "API key"}</span>
                        <input
                            className="em-input"
                            value={keyValue}
                            autoFocus
                            placeholder="Paste your key"
                            onChange={(event) => setKeyValue(event.target.value)}
                        />
                    </label>
                    <div className="em-row">
                        <button
                            type="button"
                            className="em-btn"
                            data-active
                            disabled={!keyValue.trim()}
                            onClick={() => {
                                const entry = keyPrompt;
                                setKeyPrompt(null);
                                void run(entry, keyValue.trim());
                            }}
                        >
                            Add layer
                        </button>
                        <button type="button" className="em-btn em-btn--ghost" onClick={() => setKeyPrompt(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}