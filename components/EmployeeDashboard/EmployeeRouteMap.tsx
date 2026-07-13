"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  RouteCluster,
  RouteStop,
  buildStopAddressLine,
  getOptimizedActiveStops,
  getStopClusterColor,
  resolveRouteStops,
} from "@/lib/employee-route";
import { hasStopCoordinates } from "@/lib/stop-coordinates";

if (typeof window !== "undefined") {
  require("leaflet/dist/leaflet.css");
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

interface EmployeeRouteMapProps {
  stops: RouteStop[];
  clusters: RouteCluster[];
  nextStopId?: string | null;
  onStopClick?: (stop: RouteStop) => void;
}

export function EmployeeRouteMap({
  stops,
  clusters,
  nextStopId,
  onStopClick,
}: EmployeeRouteMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [resolvedStops, setResolvedStops] = useState<RouteStop[]>(stops);
  const [geocoding, setGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.749, -84.388]);
  const [mapZoom, setMapZoom] = useState(11);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCoordinates() {
      if (stops.length === 0) {
        setResolvedStops([]);
        return;
      }

      setGeocoding(true);
      const enriched = await resolveRouteStops(stops);
      if (!cancelled) {
        setResolvedStops(enriched);
        setGeocoding(false);
      }
    }

    loadCoordinates();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const orderedStops = useMemo(
    () => getOptimizedActiveStops(resolvedStops.filter((stop) => hasStopCoordinates(stop))),
    [resolvedStops]
  );

  const stopsWithCoords = useMemo(
    () => resolvedStops.filter((stop) => hasStopCoordinates(stop)),
    [resolvedStops]
  );

  useEffect(() => {
    if (stopsWithCoords.length === 0) {
      return;
    }

    if (stopsWithCoords.length === 1) {
      setMapCenter([stopsWithCoords[0].latitude!, stopsWithCoords[0].longitude!]);
      setMapZoom(14);
      return;
    }

    const lats = stopsWithCoords.map((stop) => stop.latitude!);
    const lons = stopsWithCoords.map((stop) => stop.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const span = Math.max(maxLat - minLat, maxLon - minLon);

    setMapCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);

    if (span > 1.5) setMapZoom(8);
    else if (span > 0.75) setMapZoom(9);
    else if (span > 0.35) setMapZoom(10);
    else if (span > 0.15) setMapZoom(11);
    else if (span > 0.08) setMapZoom(12);
    else setMapZoom(13);
  }, [stopsWithCoords]);

  const polyline = orderedStops.map(
    (stop) => [stop.latitude!, stop.longitude!] as [number, number]
  );

  if (!mapReady) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          border: "1px solid #e5e7eb",
          height: "320px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
        }}
      >
        Loading map...
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        No stops to show on the map.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          height: "clamp(280px, 55vw, 380px)",
          position: "relative",
        }}
      >
        {MapContainer && TileLayer && Marker && Popup ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {Polyline && polyline.length > 1 && (
              <Polyline positions={polyline} color="#2563eb" weight={3} opacity={0.65} />
            )}

            {stopsWithCoords.map((stop, index) => {
              const isNext = stop.id === nextStopId;
              const clusterColor =
                getStopClusterColor(stop.id, clusters) || "#16a34a";
              const orderIndex =
                orderedStops.findIndex((ordered) => ordered.id === stop.id) + 1;

              if (CircleMarker) {
                return (
                  <CircleMarker
                    key={stop.id}
                    center={[stop.latitude!, stop.longitude!]}
                    radius={isNext ? 12 : 9}
                    pathOptions={{
                      color: isNext ? "#111827" : clusterColor,
                      fillColor: isNext ? "#16a34a" : clusterColor,
                      fillOpacity: 0.9,
                      weight: isNext ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => onStopClick?.(stop),
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: "180px" }}>
                        <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>
                          {orderIndex > 0 ? `Stop ${orderIndex}` : "Stop"} ·{" "}
                          {stop.customerName || stop.userEmail || "Customer"}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                          {buildStopAddressLine(stop)}
                        </div>
                        {isNext && (
                          <div
                            style={{
                              marginTop: "0.35rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#16a34a",
                            }}
                          >
                            Next stop
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              }

              return (
                <Marker
                  key={stop.id}
                  position={[stop.latitude!, stop.longitude!]}
                  eventHandlers={{
                    click: () => onStopClick?.(stop),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: "180px" }}>
                      <div style={{ fontWeight: 700 }}>
                        {stop.customerName || stop.userEmail || "Customer"}
                      </div>
                      <div style={{ fontSize: "0.8125rem" }}>
                        {buildStopAddressLine(stop)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
            }}
          >
            Map loading...
          </div>
        )}
      </div>

      {geocoding && (
        <div
          style={{
            padding: "0.75rem",
            fontSize: "0.8125rem",
            color: "#6b7280",
            textAlign: "center",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          Pinpointing {stops.length} stop{stops.length === 1 ? "" : "es"}...
        </div>
      )}

      {!geocoding && stopsWithCoords.length > 0 && (
        <div
          style={{
            padding: "0.75rem",
            fontSize: "0.8125rem",
            color: "#166534",
            fontWeight: 600,
            textAlign: "center",
            borderTop: "1px solid #e5e7eb",
            background: "#f0fdf4",
          }}
        >
          {stopsWithCoords.length} pinned · {clusters.length} area
          {clusters.length === 1 ? "" : "s"} · blue line = suggested drive order
        </div>
      )}

      {!geocoding && stops.length > 0 && stopsWithCoords.length === 0 && (
        <div
          style={{
            padding: "0.75rem",
            fontSize: "0.8125rem",
            color: "#6b7280",
            textAlign: "center",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          Could not map these addresses. Use the list view or open maps from each stop.
        </div>
      )}
    </div>
  );
}
