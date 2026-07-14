"use client";

import { useState } from "react";
import { SERVICE_AREAS } from "@/lib/service-areas";
import { SERVICE_AREA_PROFILES, type ServiceAreaProfile } from "@/data/serviceAreaHistory";

export function ServiceAreasExplorer() {
  const [activeArea, setActiveArea] = useState<ServiceAreaProfile | null>(null);

  function handleSelect(area: (typeof SERVICE_AREAS)[number]) {
    const profile = SERVICE_AREA_PROFILES[area];
    setActiveArea((current) => (current?.name === area ? null : profile));
  }

  return (
    <div className="service-areas-explorer">
      <p className="service-areas-explorer__hint">
        Tap a city for local history &amp; fun facts
      </p>

      <div className="service-areas-grid" role="tablist" aria-label="Service area cities">
        {SERVICE_AREAS.map((area) => {
          const isActive = activeArea?.name === area;
          return (
            <button
              key={area}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`service-area-panel-${area.replace(/\s+/g, "-").toLowerCase()}`}
              className={`service-area-chip service-area-chip--interactive${isActive ? " active" : ""}`}
              onClick={() => handleSelect(area)}
            >
              {area}
            </button>
          );
        })}
      </div>

      {activeArea && (
        <div
          id={`service-area-panel-${activeArea.name.replace(/\s+/g, "-").toLowerCase()}`}
          role="tabpanel"
          className="service-area-panel"
        >
          <div className="service-area-panel__header">
            <div>
              <p className="service-area-panel__county">{activeArea.county}</p>
              <h3 className="service-area-panel__title">{activeArea.name}</h3>
              <p className="service-area-panel__tagline">{activeArea.tagline}</p>
            </div>
            <button
              type="button"
              className="service-area-panel__close"
              onClick={() => setActiveArea(null)}
              aria-label={`Close ${activeArea.name} history`}
            >
              ×
            </button>
          </div>

          {activeArea.timeline.length > 0 && (
            <div className="service-area-timeline">
              <h4 className="service-area-panel__section-title">Local timeline</h4>
              <ol className="service-area-timeline__list">
                {activeArea.timeline.map((entry) => (
                  <li key={`${entry.year}-${entry.title}`} className="service-area-timeline__item">
                    <span className="service-area-timeline__year">{entry.year}</span>
                    <div className="service-area-timeline__content">
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {activeArea.funFacts.length > 0 && (
            <div className="service-area-facts">
              <h4 className="service-area-panel__section-title">Fun facts</h4>
              <ul className="service-area-facts__list">
                {activeArea.funFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
