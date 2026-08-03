import { BASEMAPS, basemapThumbnail } from "../constants/basemaps";

export interface BasemapGalleryProps {
  activeId: string;
  onSelect: (id: string) => void;
}

/** Eight public basemaps; the thumbnail is a live tile from each service. */
export function BasemapGallery({ activeId, onSelect }: BasemapGalleryProps) {
  const active = BASEMAPS.find((b) => b.id === activeId);

  return (
    <section className="em-section">
      <h2>Basemap</h2>
      <div className="em-basemaps">
        {BASEMAPS.map((basemap) => (
          <figure
            key={basemap.id}
            className="em-basemap"
            data-active={basemap.id === activeId}
            role="button"
            tabIndex={0}
            aria-pressed={basemap.id === activeId}
            onClick={() => onSelect(basemap.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(basemap.id);
              }
            }}
          >
            <img src={basemapThumbnail(basemap)} alt="" loading="lazy" />
            <figcaption>
              <b>{basemap.name}</b>
              <small>{basemap.provider}</small>
            </figcaption>
          </figure>
        ))}
      </div>
      {active?.note ? <p className="em-hint">{active.note}</p> : null}
    </section>
  );
}