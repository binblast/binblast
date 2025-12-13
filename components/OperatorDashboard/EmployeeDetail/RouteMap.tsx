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

interface Stop {
  id: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  city?: string;
  county?: string;
  customerName?: string;
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

  useEffect(() => {
    // Map is ready when component mounts
    setMapReady(true);
  }, []);

  useEffect(() => {
    setOptimizedStops(stops);
  }, [stops]);

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const response = await fetch("/api/operator/route/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedStops(data.optimizedStops || stops);
        alert(`Route optimized! ${data.counties} counties, ${data.totalStops} stops`);
      }
    } catch (error) {
      console.error("Error optimizing route:", error);
      alert("Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  };

  // Calculate center point
  const getMapCenter = (): [number, number] => {
    if (stops.length === 0) {
      // Default to Atlanta area
      return [33.749, -84.388];
    }

    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
    if (stopsWithCoords.length === 0) {
      return [33.749, -84.388];
    }

    const avgLat = stopsWithCoords.reduce((sum, s) => sum + (s.latitude || 0), 0) / stopsWithCoords.length;
    const avgLon = stopsWithCoords.reduce((sum, s) => sum + (s.longitude || 0), 0) / stopsWithCoords.length;
    return [avgLat, avgLon];
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
          Route Map
        </h3>
        <button
          onClick={handleOptimizeRoute}
          disabled={optimizing || stops.length === 0}
          style={{
            padding: "0.5rem 1rem",
            background: optimizing || stops.length === 0 ? "#9ca3af" : "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: optimizing || stops.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {optimizing ? "Optimizing..." : "Optimize Route"}
        </button>
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
            
            {/* Employee Location */}
            {employeeLocation && (
              <Marker position={[employeeLocation.latitude, employeeLocation.longitude]}>
                <Popup>Employee Location</Popup>
              </Marker>
            )}

            {/* Stop Markers */}
            {optimizedStops
              .filter(s => s.latitude && s.longitude)
              .map((stop, index) => (
                <Marker key={stop.id} position={[stop.latitude!, stop.longitude!]}>
                  <Popup>
                    <div>
                      <strong>Stop {index + 1}</strong>
                      <br />
                      {stop.customerName || "Customer"}
                      <br />
                      {stop.addressLine1 && `${stop.addressLine1}, ${stop.city}`}
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
    </div>
  );
}

