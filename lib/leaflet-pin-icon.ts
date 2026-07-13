import type { DivIcon } from "leaflet";

export function createStopPinIcon(color: string, label?: string | number): DivIcon | null {
  if (typeof window === "undefined") {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const displayLabel =
    label === undefined || label === null || label === "" ? "" : String(label);

  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35));">
        <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M15 0C7.82 0 2 5.82 2 13c0 10.25 13 24 13 24s13-13.75 13-24C28 5.82 22.18 0 15 0z" fill="${color}" stroke="#111827" stroke-width="1.5"/>
          ${
            displayLabel
              ? `<text x="15" y="16" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${displayLabel}</text>`
              : ""
          }
        </svg>
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}
