"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";
import { parseGeoPoint } from "@/lib/geo-utils";
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
  latitude?: number;
  longitude?: number;
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
};

interface OperatorLiveMapProps {
  operatorId?: string;
}

export function OperatorLiveMap({ operatorId }: OperatorLiveMapProps) {
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);
  const [employees, setEmployees] = useState<FleetEmployee[]>([]);
  const [stops, setStops] = useState<FleetStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    let unsubscribers: Array<() => void> = [];

    async function setupListeners() {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const today = getTodayDateString();

      const employeesQuery = query(collection(db, "users"), where("role", "==", "employee"));
      const cleaningsQuery = query(
        collection(db, "scheduledCleanings"),
        where("scheduledDate", "==", today)
      );

      const unsubEmployees = onSnapshot(employeesQuery, (snapshot) => {
        const fleet = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const location = parseGeoPoint(data.lastKnownLocation);
          return {
            id: docSnap.id,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email || "Employee",
            latitude: location?.latitude,
            longitude: location?.longitude,
            isClockedIn: data.isClockedIn === true || data.shiftStatus === "clocked_in",
          };
        });
        setEmployees(fleet);
        setLastSync(new Date());
        setLoading(false);
      });

      const unsubCleanings = onSnapshot(cleaningsQuery, (snapshot) => {
        const todayStops = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FleetStop[];

        const activeStops = todayStops.filter((stop) => {
          const status = stop.status || stop.jobStatus;
          return status !== "completed" && status !== "cancelled";
        });

        activeStops.sort((a, b) => {
          if (typeof a.routeSequence === "number" && typeof b.routeSequence === "number") {
            return a.routeSequence - b.routeSequence;
          }
          return 0;
        });

        setStops(activeStops);
        setLastSync(new Date());
      });

      unsubscribers = [unsubEmployees, unsubCleanings];
    }

    setupListeners().catch((error) => {
      console.error("[OperatorLiveMap] listener setup failed:", error);
      setLoading(false);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [operatorId]);

  const stopsWithCoords = useMemo(
    () => stops.filter((stop) => hasStopCoordinates(stop)),
    [stops]
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>Live Fleet Map</h3>
          <p style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            Real-time employee locations and today&apos;s routes
            {lastSync ? ` · synced ${lastSync.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#374151" }}>
          <span>
            <strong>{employees.filter((e) => e.isClockedIn).length}</strong> clocked in
          </span>
          <span>
            <strong>{stops.length}</strong> active stops
          </span>
        </div>
      </div>

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
          Connecting to live data...
        </div>
      )}
    </div>
  );
}
