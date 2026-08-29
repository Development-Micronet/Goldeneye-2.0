import { useState, useEffect, useRef } from "react";
import { useMapStore } from "../store/useMapStore";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [minLat, maxLat, minLon, maxLon]
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

export default function LocationSearch() {
  const map = useMapStore((state) => state.map);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  /*
   * Picking a result writes display_name back into `query`, which would
   * otherwise retrigger the search effect and reopen the panel 350ms
   * after the user dismissed it.
   */
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const term = query.trim();

    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", term);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "6");
        url.searchParams.set("addressdetails", "0");

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { "Accept-Language": "en" },
        });

        if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);

        const data: NominatimResult[] = await res.json();

        setResults(data);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn("[LocationSearch]", err.message);
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        /*
         * A superseded request settles *after* the next one has already
         * set isLoading(true), so clearing unconditionally kills the
         * spinner while a live request is still in flight.
         */
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    // also covers unmount: no orphaned request, no setState afterwards
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectResult = (result: NominatimResult) => {
    skipNextSearch.current = true;

    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
    setActiveIndex(-1);

    if (!map) return;

    const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(Number);

    if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) return;

    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 60, duration: 1200, maxZoom: 17, essential: true },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && !isOpen && results.length > 0) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // -1 means "nothing highlighted"; stepping up from there wraps to the end
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        selectResult(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (activeIndex < 0) return;

    const item = dropdownRef.current?.children[activeIndex] as HTMLElement | undefined;

    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const panelOpen = isOpen && query.trim().length >= MIN_QUERY_LENGTH;
  const showEmpty = panelOpen && !isLoading && results.length === 0;

  return (
    <div
      ref={wrapperRef}
      className="location-search-wrapper font-inter absolute top-3 left-1/2 z-40 w-[min(420px,calc(100vw-160px))] -translate-x-1/2"
    >
      {/* Input row */}
      <div
        className={`focus-within:border-primary focus-within:ring-primary/30 border-primary/25 flex items-center overflow-hidden border bg-white/95 shadow-md backdrop-blur transition-all duration-150 focus-within:ring-1 ${
          panelOpen ? "rounded-t-xl" : "rounded-xl"
        }`}
      >
        {/* Search icon */}
        <span aria-hidden className="text-primary flex shrink-0 items-center pr-1.5 pl-3.5">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          id="location-search-input"
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={panelOpen}
          aria-autocomplete="list"
          aria-controls="location-search-results"
          aria-busy={isLoading}
          aria-activedescendant={activeIndex >= 0 ? `location-result-${activeIndex}` : undefined}
          placeholder="Search for a location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 border-none bg-transparent px-2 py-2.5 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400"
        />

        {/* Right slot: spinner or clear */}
        <span className="flex min-w-7 shrink-0 items-center pr-3">
          {isLoading ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-primary animate-spin"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : query.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="bg-primary-100 text-primary hover:bg-primary/10 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-none transition-colors duration-150"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </span>
      </div>

      {/* Results dropdown */}
      {panelOpen && (
        <div className="border-primary/25 overflow-hidden rounded-b-xl border border-t-0 bg-white/95 shadow-lg backdrop-blur">
          {showEmpty ? (
            <p className="px-3.5 py-3 text-[13px] text-slate-500">
              No place matches “{query.trim()}”
            </p>
          ) : (
            <ul
              ref={dropdownRef}
              id="location-search-results"
              role="listbox"
              aria-label="Location suggestions"
              className="m-0 max-h-64 list-none overflow-y-auto py-1"
            >
              {results.map((result, i) => (
                <li
                  key={result.place_id}
                  id={`location-result-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectResult(result);
                  }}
                  className={`flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 transition-colors duration-100 ${
                    activeIndex === i
                      ? "bg-primary-100 text-primary"
                      : "hover:bg-primary-100/60 text-slate-800"
                  }`}
                >
                  <span className="text-primary mt-0.5 shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </span>
                  <span
                    className="overflow-hidden text-[13px] leading-snug"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {result.display_name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
