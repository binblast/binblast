"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { createStopPinIcon } from "@/lib/leaflet-pin-icon";
import { buildStopAddress } from "@/lib/stop-coordinates";

import "leaflet/dist/leaflet.css";

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
  status?: string;
  jobStatus?: string;
}

interface OperatorRouteMapInnerProps {
  mapCenter: [number, number];
  mapZoom: number;
  stops: Stop[];
  employeeLocation?: { latitude: number; longitude: number };
  showRouteLines: boolean;
}

function getStopColor(stop: Stop) {
  const status = stop.status || stop.jobStatus || "pending";
  if (status === "completed") return "#16a34a";
  if (status === "in_progress") return "#3b82f6";
  if (status === "cancelled") return "#9ca3af";
  return "#f59e0b";
}

export function OperatorRouteMapInner({
  mapCenter,
  mapZoom,
  stops,
  employeeLocation,
  showRouteLines,
}: OperatorRouteMapInnerProps) {
  const routePolyline = useMemo(
    () =>
      stops.map((stop) => [stop.latitude!, stop.longitude!] as [number, number]),
    [stops]
  );

  const employeePinIcon = useMemo(() => createStopPinIcon("#16a34a"), []);

  return (
    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {showRouteLines && routePolyline.length > 1 && (
        <Polyline positions={routePolyline} color="#3b82f6" weight={4} opacity={0.7} />
      )}

      {employeeLocation && employeePinIcon && (
        <Marker
          position={[employeeLocation.latitude, employeeLocation.longitude]}
          icon={employeePinIcon}
        >
          <Popup>
            <div>
              <strong>Employee Location</strong>
            </div>
          </Popup>
        </Marker>
      )}

      {stops.map((stop, index) => {
        const color = getStopColor(stop);
        const order = stop.routeSequence ?? index + 1;
        const pinIcon = createStopPinIcon(color, order);
        if (!pinIcon) return null;

        return (
          <Marker
            key={stop.id}
            position={[stop.latitude!, stop.longitude!]}
            icon={pinIcon}
          >
            <Popup>
              <div style={{ minWidth: "200px" }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "1rem",
                    marginBottom: "0.5rem",
                    color: "#111827",
                  }}
                >
                  Stop {order}
                </div>
                {stop.customerName && (
                  <div style={{ marginBottom: "0.25rem", color: "#374151" }}>
                    <strong>Customer:</strong> {stop.customerName}
                  </div>
                )}
                <div style={{ marginBottom: "0.25rem", color: "#374151" }}>
                  <strong>Address:</strong> {buildStopAddress(stop) || "Address not available"}
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
        );
      })}
    </MapContainer>
  );
}
