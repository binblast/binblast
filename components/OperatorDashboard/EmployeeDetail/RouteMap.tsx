// components/OperatorDashboard/EmployeeDetail/RouteMap.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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
}

interface RouteMapProps {
  employeeId: string;
  stops: Stop[];
  employeeLocation?: { latitude: number; longitude: number };
}

export function RouteMap({ employeeId, stops, employeeLocation }: RouteMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [optimizedStops, setOptimizedStops] = useState<Stop[]>(stops);
  const [optimizing, setOptimizing] = useState(false);
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

  useEffect(() => {
    // Map is ready when component mounts
    setMapReady(true);
  }, []);

  useEffect(() => {
    setOptimizedStops(stops);
  }, [stops]);

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    setMessage({ type: null, text: "" });
    
    try {
      // Filter stops that have coordinates for optimization
      const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
      
      if (stopsWithCoords.length === 0) {
        setMessage({ type: "error", text: "No stops with coordinates available for optimization" });
        setOptimizing(false);
        return;
      }

      const response = await fetch("/api/operator/route/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: stopsWithCoords }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedStops(data.optimizedStops || stops);
        setMessage({ 
          type: "success", 
          text: `Route optimized! ${data.counties} counties, ${data.totalStops} stops` 
        });
        // Clear message after 5 seconds
        setTimeout(() => setMessage({ type: null, text: "" }), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ 
          type: "error", 
          text: errorData.error || "Failed to optimize route" 
        });
      }
    } catch (error) {
      console.error("Error optimizing route:", error);
      setMessage({ type: "error", text: "Failed to optimize route. Please try again." });
    } finally {
      setOptimizing(false);
    }
  };

  // Calculate center point
  const getMapCenter = (): [number, number] => {
    const stopsToUse = optimizedStops.length > 0 ? optimizedStops : stops;
    
    if (stopsToUse.length === 0) {
      // Default to Atlanta area
      return [33.749, -84.388];
    }

    const stopsWithCoords = stopsToUse.filter(s => s.latitude && s.longitude);
    if (stopsWithCoords.length === 0) {
      return [33.749, -84.388];
    }

    const avgLat = stopsWithCoords.reduce((sum, s) => sum + (s.latitude || 0), 0) / stopsWithCoords.length;
    const avgLon = stopsWithCoords.reduce((sum, s) => sum + (s.longitude || 0), 0) / stopsWithCoords.length;
    return [avgLat, avgLon];
  };

  // Get route polyline coordinates
  const getRoutePolyline = (): [number, number][] => {
    return optimizedStops
      .filter(s => s.latitude && s.longitude)
      .map(s => [s.latitude!, s.longitude!] as [number, number]);
  };

  // Format address for display
  const formatAddress = (stop: Stop): string => {
    const parts: string[] = [];
    if (stop.addressLine1) parts.push(stop.addressLine1);
    if (stop.city) parts.push(stop.city);
    if (stop.state) parts.push(stop.state);
    if (stop.zipCode) parts.push(stop.zipCode);
    return parts.join(", ") || "Address not available";
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
            {optimizedStops.length > 0 && optimizedStops.some(s => s.latitude && s.longitude) && (
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
              disabled={optimizing || stops.length === 0 || stops.filter(s => s.latitude && s.longitude).length === 0}
              style={{
                padding: "0.5rem 1rem",
                background: (optimizing || stops.length === 0 || stops.filter(s => s.latitude && s.longitude).length === 0) ? "#9ca3af" : "#3b82f6",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: (optimizing || stops.length === 0 || stops.filter(s => s.latitude && s.longitude).length === 0) ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!(optimizing || stops.length === 0 || stops.filter(s => s.latitude && s.longitude).length === 0)) {
                  e.currentTarget.style.opacity = "0.9";
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
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
            center={getMapCenter()}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Route Polyline */}
            {showRouteLines && Polyline && getRoutePolyline().length > 1 && (
              <Polyline
                positions={getRoutePolyline()}
                color="#3b82f6"
                weight={4}
                opacity={0.7}
              />
            )}
            
            {/* Employee Location */}
            {employeeLocation && (
              <Marker position={[employeeLocation.latitude, employeeLocation.longitude]}>
                <Popup>
                  <div>
                    <strong>Employee Location</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Stop Markers */}
            {optimizedStops
              .filter(s => s.latitude && s.longitude)
              .map((stop, index) => (
                <Marker key={stop.id} position={[stop.latitude!, stop.longitude!]}>
                  <Popup>
                    <div style={{ minWidth: "200px" }}>
                      <div style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.5rem", color: "#111827" }}>
                        Stop {index + 1}
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
      
      {stops.length > 0 && stops.filter(s => s.latitude && s.longitude).length === 0 && (
        <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Geocoding addresses... Pins will appear once coordinates are available.
        </div>
      )}
    </div>
  );
}

