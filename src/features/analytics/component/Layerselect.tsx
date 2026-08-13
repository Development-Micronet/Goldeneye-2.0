import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Layers, Search } from "lucide-react";
import { useRasterStore, type RasterLayer } from "../store/useRasterStore";

interface LayerSelectProps {
  layers: RasterLayer[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export const LayerSelect: React.FC<LayerSelectProps> = ({
  layers,
  selectedId,
  loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const fitRasterId = useRasterStore((state) => state.fitRasterId);
  const setFitRasterId = useRasterStore((state) => state.setFitRasterId);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (id: string) => `${baseId}-option-${id}`;

  const selected = layers.find((layer) => layer.id === fitRasterId);

  
  // console.log("selected", layers,fitRasterId,selected);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return layers;

    return layers.filter(
      (layer) =>
        layer.name.toLowerCase().includes(term) ||
        layer.projection?.toLowerCase().includes(term) ||
        layer.type.toLowerCase().includes(term),
    );
  }, [layers, query]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset on close: resetting on open reads a `filtered` list that is
      // still narrowed by the previous query, so the cursor lands wrong.
      setQuery("");
      setCursor(0);
      return;
    }

    const index = layers.findIndex((layer) => layer.id === selectedId);

    setCursor(index < 0 ? 0 : index);

    // focus after the panel paints
    const frame = requestAnimationFrame(() => searchRef.current?.focus());

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* keep the cursor inside the list as it narrows */
  useEffect(() => {
    setCursor((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  /* the list scrolls, so arrow keys have to bring the cursor into view */
  useEffect(() => {
    if (!open) return;

    listRef.current
      ?.querySelector<HTMLElement>('[data-cursor="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const commit = (id: string) => {
    setFitRasterId(id);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      // Enter and Space are left to the trigger's own click handler —
      // handling them here would toggle twice and cancel out. Without
      // this guard, Enter on the closed trigger committed filtered[0]
      // instead of opening the menu.
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }

      return;
    }

    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setCursor(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setCursor(Math.max(0, filtered.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const layer = filtered[cursor];

      if (layer) commit(layer.id);
    }
  };

  if (loading && layers.length === 0) {
    return (
      <div className="space-y-2">
        <div className="bg-border h-3 w-20 animate-pulse rounded" />
        <div className="bg-border/70 h-10 w-full animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <p className="font-mona text-text-secondary mb-1.5 text-[10px] font-bold tracking-[0.12em] uppercase">
        Raster layer
      </p>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`focus-visible:outline-primary flex w-full items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${open ? "border-primary ring-primary/30 ring-1" : "border-border hover:border-primary/50"} `}
      >
        <span className="bg-primary-100 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <Layers size={14} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="font-mona text-primary block truncate text-[13px] font-semibold">
            {selected?.name ?? "Select a layer"}
          </span>
          <span className="text-text-secondary block truncate text-[10px]">
            {selected
              ? `${selected.type.toUpperCase()} · ${selected.projection ?? "CRS unknown"} · ${selected.operations.length} result${selected.operations.length === 1 ? "" : "s"}`
              : `${layers.length} layer${layers.length === 1 ? "" : "s"} loaded`}
          </span>
        </span>

        <ChevronDown
          size={15}
          className={`text-text-secondary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {open && (
        <div className="border-border absolute z-30 mt-1.5 w-full origin-top overflow-hidden rounded-lg border bg-white shadow-[0_12px_28px_-12px_rgba(44,102,113,0.45)]">
          <div className="border-border flex items-center gap-1.5 border-b px-2.5 py-2">
            <Search size={13} className="text-text-secondary shrink-0" />

            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              placeholder="Search layers"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                filtered[cursor] ? optionId(filtered[cursor].id) : undefined
              }
              className="text-text-muted placeholder:text-text-secondary w-full bg-transparent text-[12px] outline-none"
            />
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto p-1"
          >
            {filtered.length === 0 && (
              <li className="text-text-secondary px-2.5 py-4 text-center text-[12px]">
                No layer matches “{query}”
              </li>
            )}

            {filtered.map((layer, index) => {
              const isSelected = layer.id === selectedId;
              const isCursor = index === cursor;

              return (
                /*
                 * role="option" belongs on the direct child of the
                 * listbox. A nested <button role="option"> leaves the
                 * <li> as an unlabelled listitem and breaks the mapping
                 * for screen readers; keyboard input is handled by the
                 * search field via aria-activedescendant.
                 */
                <li
                  key={layer.id}
                  id={optionId(layer.id)}
                  role="option"
                  aria-selected={isSelected}
                  data-cursor={isCursor || undefined}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => commit(layer.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors duration-100 ${isSelected
                    ? "border-primary bg-primary-100 text-primary"
                    : isCursor
                      ? "bg-primary-100/60 text-text-muted border-transparent"
                      : "text-text-muted border-transparent"
                    } `}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected && <Check size={13} className="text-primary" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[12px] ${isSelected ? "font-semibold" : "font-medium"
                        }`}
                    >
                      {layer.name}
                    </span>
                    <span className="text-text-secondary block truncate text-[10px]">
                      {layer.type.toUpperCase()} · {layer.projection ?? "CRS unknown"}
                    </span>
                  </span>

                  {layer.operations.length > 0 && (
                    <span className="bg-primary/10 font-mona text-primary shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums">
                      {layer.operations.length}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};