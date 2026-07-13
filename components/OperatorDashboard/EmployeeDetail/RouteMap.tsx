// components/OperatorDashboard/EmployeeDetail/RouteMap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildStopAddress, hasStopCoordinates } from "@/lib/stop-coordinates";

// Import Leaflet CSS - Next.js will handle this
if (typeof window !== "undefined") {
  require("leaflet/dist/leaflet.css");
}

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(mod => mod.Polyline), { ssr: false });

interface Stop {
  id: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  customerName?: string;
  scheduledTime?: string;
  routeSequence?: number;
}

interface RouteMapProps {
  employeeId: string;
  stops: Stop[];
  employeeLocation?: { latitude: number; longitude: number };
  refreshKey?: number;
}

async function geocodeStopAddress(stop: Stop): Promise<Stop> {
  if (hasStopCoordinates(stop)) {
    return stop;
  }

  const address = buildStopAddress(stop);
  if (!address) {
    return stop;
  }

  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!response.ok) {
      return stop;
    }

    const data = await response.json();
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return stop;
    }

    return {
      ...stop,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error("Error geocoding stop for map:", error);
    return stop;
  }
}

export function RouteMap({ employeeId, stops, employeeLocation, refreshKey = 0 }: RouteMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [resolvedStops, setResolvedStops] = useState<Stop[]>(stops);
  const [optimizedStops, setOptimizedStops] = useState<Stop[]>(stops);
  const [optimizing, setOptimizing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.749, -84.388]);
  const [mapZoom, setMapZoom] = useState(11);
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveStopCoordinates() {
      if (stops.length === 0) {
        setResolvedStops([]);
        setOptimizedStops([]);
        return;
      }

      const sortedStops = [...stops].sort((a, b) => {
        if (typeof a.routeSequence === "number" && typeof b.routeSequence === "number") {
          return a.routeSequence - b.routeSequence;
        }
        return 0;
      });

      setGeocoding(true);
      const enrichedStops: Stop[] = [];

      for (const stop of sortedStops) {
        if (cancelled) return;
        enrichedStops.push(await geocodeStopAddress(stop));
      }

      if (!cancelled) {
        setResolvedStops(enrichedStops);
        setOptimizedStops(enrichedStops);
        setGeocoding(false);
      }
    }

    resolveStopCoordinates();

    return () => {
      cancelled = true;
    };
  }, [stops, refreshKey]);

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    setMessage({ type: null, text: "" });

    try {
      const stopsWithCoords = resolvedStops.filter((stop) => hasStopCoordinates(stop));

      if (stopsWithCoords.length === 0) {
        setMessage({ type: "error", text: "No stops with coordinates available for optimization" });
        setOptimizing(false);
        return;
      }

      const response = await fetch("/api/operator/route/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: stopsWithCoords,
          startLocation: employeeLocation || null,
          persist: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedStops(data.optimizedStops || resolvedStops);
        setMessage({
          type: "success",
          text: `Route optimized and synced! ${data.totalStops} stops ordered by neighborhood proximity`,
        });
        setTimeout(() => setMessage({ type: null, text: "" }), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to optimize route",
        });
      }
    } catch (error) {
      console.error("Error optimizing route:", error);
      setMessage({ type: "error", text: "Failed to optimize route. Please try again." });
    } finally {
      setOptimizing(false);
    }
  };

  const stopsWithCoords = useMemo(
    () => optimizedStops.filter((stop) => hasStopCoordinates(stop)),
    [optimizedStops]
  );

  useEffect(() => {
    const positions: Array<{ latitude: number; longitude: number }> = stopsWithCoords.map((stop) => ({
      latitude: stop.latitude!,
      longitude: stop.longitude!,
    }));

    if (employeeLocation) {
      positions.push(employeeLocation);
    }

    if (positions.length === 0) {
      setMapCenter(employeeLocation ? [employeeLocation.latitude, employeeLocation.longitude] : [33.749, -84.388]);
      setMapZoom(employeeLocation ? 13 : 11);
      return;
    }

    if (positions.length === 1) {
      setMapCenter([positions[0].latitude, positions[0].longitude]);
      setMapZoom(14);
      return;
    }

    const lats = positions.map((point) => point.latitude);
    const lons = positions.map((point) => point.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    setMapCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);

    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    const span = Math.max(latSpan, lonSpan);

    if (span > 1.5) setMapZoom(8);
    else if (span > 0.75) setMapZoom(9);
    else if (span > 0.35) setMapZoom(10);
    else if (span > 0.15) setMapZoom(11);
    else if (span > 0.08) setMapZoom(12);
    else setMapZoom(13);
  }, [stopsWithCoords, employeeLocation]);

  const getRoutePolyline = (): [number, number][] => {
    return stopsWithCoords.map(
      (stop) => [stop.latitude!, stop.longitude!] as [number, number]
    );
  };

  const formatAddress = (stop: Stop): string => {
    return buildStopAddress(stop) || "Address not available";
  };

  if (!mapReady) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "#6b7280" }}>Loading map...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "1rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            Route Map
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {stopsWithCoords.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showRouteLines}
                  onChange={(e) => setShowRouteLines(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Show Route Lines
              </label>
            )}
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || geocoding || stopsWithCoords.length === 0}
              style={{
                padding: "0.5rem 1rem",
                background: optimizing || geocoding || stopsWithCoords.length === 0 ? "#9ca3af" : "#3b82f6",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: optimizing || geocoding || stopsWithCoords.length === 0 ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
            >
              {optimizing ? "Optimizing..." : "Optimize Route"}
            </button>
          </div>
        </div>
        {message.text && (
          <div style={{
            padding: "0.75rem",
            borderRadius: "6px",
            fontSize: "0.875rem",
            background: message.type === "success" ? "#d1fae5" : "#fee2e2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            marginBottom: "0.5rem",
          }}>
            {message.text}
          </div>
        )}
      </div>

      <div style={{ height: "500px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb", position: "relative" }}>
        {typeof window !== "undefined" && MapContainer && TileLayer && Marker && Popup ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {showRouteLines && Polyline && getRoutePolyline().length > 1 && (
              <Polyline
                positions={getRoutePolyline()}
                color="#3b82f6"
                weight={4}
                opacity={0.7}
              />
            )}

            {employeeLocation && (
              <Marker position={[employeeLocation.latitude, employeeLocation.longitude]}>
                <Popup>
                  <div>
                    <strong>Employee Location</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {stopsWithCoords.map((stop, index) => (
              <Marker key={stop.id} position={[stop.latitude!, stop.longitude!]}>
                <Popup>
                  <div style={{ minWidth: "200px" }}>
                    <div style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.5rem", color: "#111827" }}>
                      Stop {stop.routeSequence ?? index + 1}
                    </div>
                    {stop.customerName && (
                      <div style={{ marginBottom: "0.25rem", color: "#374151" }}>
                        <strong>Customer:</strong> {stop.customerName}
                      </div>
                    )}
                    <div style={{ marginBottom: "0.25rem", color: "#374151" }}>
                      <strong>Address:</strong> {formatAddress(stop)}
                    </div>
                    {stop.scheduledTime && (
                      <div style={{ marginBottom: "0.25rem", color: "#374151" }}>
                        <strong>Time:</strong> {stop.scheduledTime}
                      </div>
                    )}
                    {stop.county && (
                      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                        {stop.county}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
          }}>
            Map loading...
          </div>
        )}
      </div>

      {stops.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          No stops to display on map
        </div>
      )}

      {stops.length > 0 && geocoding && (
        <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Pinpointing {stops.length} stop address{stops.length === 1 ? "" : "es"} on the map...
        </div>
      )}

      {stops.length > 0 && !geocoding && stopsWithCoords.length === 0 && (
        <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Could not pinpoint these addresses on the map. Check that each stop has a full street address.
        </div>
      )}

      {stopsWithCoords.length > 0 && (
        <div style={{ textAlign: "center", padding: "0.75rem", color: "#166534", fontSize: "0.8125rem", fontWeight: "600" }}>
          {stopsWithCoords.length} stop{stopsWithCoords.length === 1 ? "" : "s"} pinned on the route map
        </div>
      )}
    </div>
  );
}
