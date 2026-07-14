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
        <span className="service-areas-explorer__hint-badge">Explore our communities</span>
        Tap a city for local history &amp; fun facts
      </p>

      <div className="service-areas-explorer__chips">
        <div className="service-areas-grid service-areas-grid--premium" role="tablist" aria-label="Service area cities">
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
                <span className="service-area-chip__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 21s6-5.686 6-10a6 6 0 1 0-12 0c0 4.314 6 10 6 10Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="11" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                </span>
                <span className="service-area-chip__label">{area}</span>
              </button>
            );
          })}
        </div>
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
