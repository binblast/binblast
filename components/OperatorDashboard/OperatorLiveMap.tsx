"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";
import { hasStopCoordinates } from "@/lib/stop-coordinates";

if (typeof window !== "undefined") {
  require("leaflet/dist/leaflet.css");
}

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((mod) => mod.CircleMarker), {
  ssr: false,
});

type FleetEmployee = {
  id: string;
  name: string;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isClockedIn: boolean;
};

type FleetStop = {
  id: string;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  city?: string;
  customerName?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  jobStatus?: string;
  status?: string;
  routeSequence?: number;
  scheduledDate?: string;
  isToday?: boolean;
  isUpcoming?: boolean;
};

type FleetStats = {
  totalEmployees: number;
  clockedIn: number;
  todayActiveStops: number;
  upcomingActiveStops: number;
  totalActiveStops: number;
};

interface OperatorLiveMapProps {
  operatorId?: string;
}

export function OperatorLiveMap({ operatorId }: OperatorLiveMapProps) {
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);
  const [employees, setEmployees] = useState<FleetEmployee[]>([]);
  const [stops, setStops] = useState<FleetStop[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mapView, setMapView] = useState<"all" | "today" | "upcoming">("all");

  const loadFleetData = useCallback(async () => {
    try {
      const response = await fetch("/api/operator/fleet/live", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load fleet data");
      }

      const data = await response.json();
      setEmployees(data.employees || []);
      setStops(data.stops || []);
      setStats(data.stats || null);
      setError(null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load fleet data";
      console.error("[OperatorLiveMap]", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    loadFleetData();

    let unsubscribers: Array<() => void> = [];
    const pollInterval = window.setInterval(loadFleetData, 20000);

    async function setupListeners() {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const today = getTodayDateString();

      const clockInsQuery = query(collection(db, "clockIns"), where("date", "==", today));
      const cleaningsQuery = query(
        collection(db, "scheduledCleanings"),
        where("scheduledDate", ">=", today)
      );

      const unsubClockIns = onSnapshot(
        clockInsQuery,
        () => loadFleetData(),
        () => loadFleetData()
      );
      const unsubCleanings = onSnapshot(
        cleaningsQuery,
        () => loadFleetData(),
        () => loadFleetData()
      );

      unsubscribers = [unsubClockIns, unsubCleanings];
    }

    setupListeners().catch((listenerError) => {
      console.warn("[OperatorLiveMap] realtime listener unavailable, using polling only:", listenerError);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      window.clearInterval(pollInterval);
    };
  }, [loadFleetData, operatorId]);

  const visibleStops = useMemo(() => {
    if (mapView === "today") return stops.filter((stop) => stop.isToday);
    if (mapView === "upcoming") return stops.filter((stop) => stop.isUpcoming);
    return stops;
  }, [stops, mapView]);

  const stopsWithCoords = useMemo(
    () => visibleStops.filter((stop) => hasStopCoordinates(stop)),
    [visibleStops]
  );

  const mapCenter = useMemo((): [number, number] => {
    const points: Array<{ latitude: number; longitude: number }> = [];

    employees.forEach((employee) => {
      if (employee.latitude != null && employee.longitude != null) {
        points.push({ latitude: employee.latitude, longitude: employee.longitude });
      }
    });

    stopsWithCoords.forEach((stop) => {
      points.push({ latitude: stop.latitude!, longitude: stop.longitude! });
    });

    if (points.length === 0) return [33.749, -84.388];

    const avgLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
    const avgLon = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
    return [avgLat, avgLon];
  }, [employees, stopsWithCoords]);

  const employeeRoutes = useMemo(() => {
    const routes = new Map<string, [number, number][]>();

    stopsWithCoords.forEach((stop) => {
      const employeeId = stop.assignedEmployeeId;
      if (!employeeId) return;
      const existing = routes.get(employeeId) || [];
      existing.push([stop.latitude!, stop.longitude!]);
      routes.set(employeeId, existing);
    });

    return routes;
  }, [stopsWithCoords]);

  if (!mapReady) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading live map...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>Live Fleet Map</h3>
          <p style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            Employee locations and active routes (today + next 7 days)
            {lastSync ? ` · synced ${lastSync.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#374151", flexWrap: "wrap" }}>
          <span>
            <strong>{stats?.clockedIn ?? employees.filter((e) => e.isClockedIn).length}</strong> clocked in
          </span>
          <span>
            <strong>{stats?.todayActiveStops ?? stops.filter((s) => s.isToday).length}</strong> today
          </span>
          <span>
            <strong>{stats?.upcomingActiveStops ?? stops.filter((s) => s.isUpcoming).length}</strong> upcoming
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {(["all", "today", "upcoming"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setMapView(view)}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "6px",
              border: mapView === view ? "2px solid #16a34a" : "1px solid #e5e7eb",
              background: mapView === view ? "#ecfdf5" : "#ffffff",
              color: mapView === view ? "#065f46" : "#374151",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {view === "all" ? "All Routes" : view === "today" ? "Today" : "Upcoming"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "0.75rem", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <div style={{ height: "480px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
        {MapContainer && (
          <MapContainer center={mapCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {Array.from(employeeRoutes.entries()).map(([employeeId, positions], index) =>
              positions.length > 1 && Polyline ? (
                <Polyline
                  key={`route-${employeeId}`}
                  positions={positions}
                  color={["#3b82f6", "#16a34a", "#f59e0b", "#8b5cf6"][index % 4]}
                  weight={3}
                  opacity={0.6}
                  dashArray="6 8"
                />
              ) : null
            )}

            {stopsWithCoords.map((stop, index) =>
              Marker ? (
                <Marker key={stop.id} position={[stop.latitude!, stop.longitude!]}>
                  <Popup>
                    <div style={{ minWidth: "180px" }}>
                      <strong>
                        #{stop.routeSequence ?? index + 1} {stop.customerName || "Stop"}
                      </strong>
                      <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                        {stop.addressLine1}, {stop.city}
                      </div>
                      <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {stop.assignedEmployeeName || "Unassigned"} · {stop.jobStatus || stop.status}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: stop.isToday ? "#16a34a" : "#f59e0b", fontWeight: "600" }}>
                        {stop.isToday ? "Today" : stop.scheduledDate || "Upcoming"}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )}

            {employees.map((employee) =>
              employee.latitude != null && employee.longitude != null && CircleMarker ? (
                <CircleMarker
                  key={employee.id}
                  center={[employee.latitude, employee.longitude]}
                  radius={10}
                  pathOptions={{
                    color: employee.isClockedIn ? "#16a34a" : "#9ca3af",
                    fillColor: employee.isClockedIn ? "#16a34a" : "#9ca3af",
                    fillOpacity: 0.9,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{employee.name}</strong>
                      <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                        {employee.isClockedIn ? "On route" : "Off shift"}
                      </div>
                      <button
                        onClick={() => router.push(`/operator/employees/${employee.id}`)}
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.375rem 0.75rem",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        View Employee
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null
            )}
          </MapContainer>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Loading fleet data...
        </div>
      )}

      {!loading && stopsWithCoords.length === 0 && visibleStops.length > 0 && (
        <div style={{ textAlign: "center", padding: "0.75rem", color: "#92400e", fontSize: "0.875rem" }}>
          {visibleStops.length} stop{visibleStops.length === 1 ? "" : "s"} found but none have map coordinates yet. Open an employee profile to geocode addresses.
        </div>
      )}

      {!loading && visibleStops.length === 0 && (
        <div style={{ textAlign: "center", padding: "0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
          No active stops in this view. Assign upcoming cleanings to employees from their profile → Assignment &amp; Zones.
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {employees.map((employee) => {
            const employeeStops = stops.filter((stop) => stop.assignedEmployeeId === employee.id);
            return (
              <button
                key={employee.id}
                onClick={() => router.push(`/operator/employees/${employee.id}`)}
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid #e5e7eb",
                  background: employee.isClockedIn ? "#ecfdf5" : "#f9fafb",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {employee.name} · {employeeStops.length} stop{employeeStops.length === 1 ? "" : "s"}
                {employee.isClockedIn ? " · on shift" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
