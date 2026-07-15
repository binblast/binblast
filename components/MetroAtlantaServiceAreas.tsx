"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ADDITIONAL_METRO_ATLANTA_AREAS,
  PRIMARY_SERVICE_AREAS,
  SERVICE_AREAS_WITH_HISTORY,
} from "@/lib/service-areas";
import { SERVICE_AREA_PROFILES, type ServiceAreaProfile } from "@/data/serviceAreaHistory";

type HistoryCity = (typeof SERVICE_AREAS_WITH_HISTORY)[number];

function isHistoryCity(city: string): city is HistoryCity {
  return (SERVICE_AREAS_WITH_HISTORY as readonly string[]).includes(city);
}

export function MetroAtlantaServiceAreas() {
  const [activeArea, setActiveArea] = useState<ServiceAreaProfile | null>(null);

  function handleSelect(city: string) {
    if (!isHistoryCity(city)) return;
    const profile = SERVICE_AREA_PROFILES[city];
    setActiveArea((current) => (current?.name === city ? null : profile));
  }

  function renderChip(city: string, interactive: boolean) {
    const isActive = activeArea?.name === city;
    const className = interactive
      ? `service-area-chip service-area-chip--interactive${isActive ? " active" : ""}`
      : "service-area-chip service-area-chip--expanding";

    if (interactive) {
      return (
        <button
          key={city}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={className}
          onClick={() => handleSelect(city)}
        >
          {city}
        </button>
      );
    }

    return (
      <span key={city} className={className}>
        {city}
      </span>
    );
  }

  return (
    <div className="service-areas-explorer">
      <div className="service-area-group">
        <h3 className="service-area-group__title">Primary Service Area</h3>
        <p className="service-area-group__hint">
          Tap a highlighted city for local history &amp; fun facts
        </p>
        <div className="service-areas-grid" role="tablist" aria-label="Primary service areas">
          {PRIMARY_SERVICE_AREAS.map((city) =>
            renderChip(city, isHistoryCity(city))
          )}
        </div>
      </div>

      <div className="service-area-group">
        <h3 className="service-area-group__title">Additional Metro Atlanta Service Areas</h3>
        <p className="service-area-group__hint">
          Tap a city for local history &amp; fun facts
        </p>
        <div
          className="service-areas-grid"
          role="tablist"
          aria-label="Additional Metro Atlanta service areas"
        >
          {ADDITIONAL_METRO_ATLANTA_AREAS.map((city) => renderChip(city, isHistoryCity(city)))}
        </div>
      </div>

      {activeArea && (
        <div
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

      <p className="service-areas-note">
        Don&apos;t see your city? Request service anyway. We are actively expanding routes and may
        already be able to service your home, neighborhood, or business.
      </p>

      <div className="service-areas-cta">
        <Link href="#pricing" className="btn btn-primary btn-large">
          Check My Service Area
        </Link>
      </div>
    </div>
  );
}
