/**
 * Click-anywhere identify popup: coordinates, elevation, copy button and
 * deep links out to Google Maps / OpenStreetMap.
 *
 * Disabled while a draw or measure tool is active so clicks are not consumed.
 */
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { copyToClipboard, fetchElevation, googleMapsLink, osmLink } from "../lib/data";
import { formatDegrees, toDMS } from "../lib/geo";

export function useInfoPopup(map: MapLibreMap | null, enabled: boolean): void {
    const popupRef = useRef<maplibregl.Popup | null>(null);

    useEffect(() => {
        if (!map || !enabled) return;

        const onClick = async (event: MapMouseEvent) => {
            const { lng, lat } = event.lngLat;
            const zoom = map.getZoom();

            const root = document.createElement("div");
            root.className = "em-popup";
            root.innerHTML = `
        <div class="em-popup__head">Point identified</div>
        <dl class="em-popup__grid">
          <dt>Latitude</dt><dd class="mono">${formatDegrees(lat)}</dd>
          <dt>Longitude</dt><dd class="mono">${formatDegrees(lng)}</dd>
          <dt>DMS</dt><dd class="mono">${toDMS(lat, "lat")} ${toDMS(lng, "lng")}</dd>
          <dt>Elevation</dt><dd class="mono" data-elevation>measuring…</dd>
        </dl>
        <div class="em-popup__actions">
          <button type="button" data-copy>Copy coordinates</button>
          <a href="${googleMapsLink(lng, lat, zoom)}" target="_blank" rel="noreferrer">Google Maps</a>
          <a href="${osmLink(lng, lat, zoom)}" target="_blank" rel="noreferrer">OpenStreetMap</a>
        </div>`;

            const copyButton = root.querySelector<HTMLButtonElement>("[data-copy]");
            copyButton?.addEventListener("click", async () => {
                const ok = await copyToClipboard(`${formatDegrees(lat)}, ${formatDegrees(lng)}`);
                copyButton.textContent = ok ? "Copied" : "Copy failed";
                window.setTimeout(() => (copyButton.textContent = "Copy coordinates"), 1600);
            });

            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
                .setLngLat(event.lngLat)
                .setDOMContent(root)
                .addTo(map);

            // Terrain gives an instant answer; otherwise fall back to Open-Meteo.
            const cell = root.querySelector<HTMLElement>("[data-elevation]");
            const local = map.getTerrain() ? map.queryTerrainElevation(event.lngLat) : null;
            const elevation = local ?? (await fetchElevation(lng, lat));
            if (cell) {
                cell.textContent =
                    elevation == null ? "not available" : `${elevation.toFixed(0)} m${local ? " (terrain)" : ""}`;
            }
        };

        map.on("click", onClick);
        return () => {
            map.off("click", onClick);
            popupRef.current?.remove();
            popupRef.current = null;
        };
    }, [map, enabled]);
}