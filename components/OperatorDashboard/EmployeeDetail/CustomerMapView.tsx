// components/OperatorDashboard/EmployeeDetail/CustomerMapView.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { clusterCustomers, Cluster } from "@/lib/proximity-utils";

if (typeof window !== "undefined") {
  require("leaflet/dist/leaflet.css");
}

const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(mod => mod.CircleMarker), { ssr: false });

interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  plan: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  zipCode?: string;
}

interface CustomerMapViewProps {
  customers: Customer[];
  selectedCustomerIds: string[];
  onCustomerSelect: (customerId: string) => void;
  onCustomerDeselect: (customerId: string) => void;
  currentOperatorId: string;
  reassignAllowed?: boolean;
}

export function CustomerMapView({
  customers,
  selectedCustomerIds,
  onCustomerSelect,
  onCustomerDeselect,
  currentOperatorId,
  reassignAllowed = false,
}: CustomerMapViewProps) {
  const [clusterRadius, setClusterRadius] = useState(1); // miles
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.749, -84.388]); // Atlanta default
  const [mapZoom, setMapZoom] = useState(11);

  // Filter customers with coordinates
  const customersWithCoords = useMemo(() => {
    return customers.filter(
      (c) => c.latitude && c.longitude && c.latitude !== null && c.longitude !== null
    ) as Array<Customer & { latitude: number; longitude: number }>;
  }, [customers]);

  // Calculate clusters
  const clusters = useMemo(() => {
    if (customersWithCoords.length === 0) return [];
    const rawClusters = clusterCustomers(customersWithCoords, clusterRadius);
    // Type assertion: customersWithCoords are Customer[], so clusters contain Customer[]
    return rawClusters.map(cluster => ({
      ...cluster,
      customers: cluster.customers as Customer[]
    }));
  }, [customersWithCoords, clusterRadius]);

  // Calculate map bounds
  useEffect(() => {
    if (customersWithCoords.length > 0) {
      const lats = customersWithCoords.map((c) => c.latitude);
      const lons = customersWithCoords.map((c) => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      setMapCenter([centerLat, centerLon]);
    }
  }, [customersWithCoords]);

  const handleClusterSelect = (clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    if (cluster) {
      cluster.customers.forEach((customer) => {
        if (!selectedCustomerIds.includes(customer.id)) {
          // Check if reassign is needed
          if (customer.assignedTo && customer.assignedTo !== currentOperatorId && !reassignAllowed) {
            return; // Skip if assigned to someone else and reassign not allowed
          }
          onCustomerSelect(customer.id);
        }
      });
    }
  };

  const handleClusterDeselect = (clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    if (cluster) {
      cluster.customers.forEach((customer) => {
        if (selectedCustomerIds.includes(customer.id)) {
          onCustomerDeselect(customer.id);
        }
      });
    }
  };

  const getMarkerColor = (customer: Customer): string => {
    if (selectedCustomerIds.includes(customer.id)) {
      return "#10b981"; // Green for selected
    }
    if (!customer.assignedTo) {
      return "#3b82f6"; // Blue for unassigned
    }
    if (customer.assignedTo === currentOperatorId) {
      return "#10b981"; // Green for assigned to this operator
    }
    return "#9ca3af"; // Gray for assigned to others
  };

  const canSelectCustomer = (customer: Customer | { id: string; assignedTo?: string | null }): boolean => {
    if (customer.assignedTo && customer.assignedTo !== currentOperatorId) {
      return reassignAllowed;
    }
    return true;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Map Section (60% height) */}
      <div style={{ height: "60%", minHeight: "400px", position: "relative", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "1rem" }}>
        {customersWithCoords.length > 0 ? (
          typeof window !== "undefined" && MapContainer && TileLayer && CircleMarker && Popup ? (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%", borderRadius: "8px" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {customersWithCoords.map((customer) => {
                const isSelected = selectedCustomerIds.includes(customer.id);
                const canSelect = canSelectCustomer(customer);
                
                return (
                  <CircleMarker
                    key={customer.id}
                    center={[customer.latitude, customer.longitude]}
                    radius={isSelected ? 10 : 6}
                    pathOptions={{
                      color: getMarkerColor(customer),
                      fillColor: getMarkerColor(customer),
                      fillOpacity: isSelected ? 0.8 : 0.6,
                      weight: isSelected ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => {
                        if (!canSelect) {
                          alert("This customer is assigned to another operator. Enable 'Reassign' to select.");
                          return;
                        }
                        if (isSelected) {
                          onCustomerDeselect(customer.id);
                        } else {
                          onCustomerSelect(customer.id);
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: "200px" }}>
                        <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{customer.name}</div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>{customer.address}</div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          {customer.city}{customer.zipCode ? ` ${customer.zipCode}` : ""}
                        </div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          Plan: {customer.plan || "N/A"}
                        </div>
                        <div style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                          Status: {customer.status || "N/A"}
                        </div>
                        {customer.assignedTo && (
                          <div style={{ fontSize: "0.875rem", color: customer.assignedTo === currentOperatorId ? "#10b981" : "#ef4444" }}>
                            {customer.assignedTo === currentOperatorId
                              ? "Assigned to this operator"
                              : `Assigned to: ${customer.assignedToName || "Unknown"}`}
                          </div>
                        )}
                        {!customer.assignedTo && (
                          <div style={{ fontSize: "0.875rem", color: "#3b82f6" }}>Unassigned</div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#6b7280",
            }}>
              Map loading...
            </div>
          )
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#6b7280",
          }}>
            No customers with coordinates available. Geocode addresses to see them on the map.
          </div>
        )}
      </div>

      {/* Clusters Panel (40% height) */}
      <div style={{
        height: "40%",
        minHeight: "200px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "1rem",
        overflowY: "auto",
        background: "#f9fafb",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>Clusters / Nearby Stops</h4>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.875rem" }}>Radius:</label>
            <select
              value={clusterRadius}
              onChange={(e) => setClusterRadius(parseFloat(e.target.value))}
              style={{
                padding: "0.25rem 0.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "0.875rem",
              }}
            >
              <option value={0.5}>0.5 mi</option>
              <option value={1}>1 mi</option>
              <option value={3}>3 mi</option>
              <option value={5}>5 mi</option>
              <option value={10}>10 mi</option>
              <option value={15}>15 mi</option>
              <option value={30}>30 mi</option>
              <option value={50}>50 mi</option>
            </select>
          </div>
        </div>

        {customersWithCoords.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>
            <div style={{ marginBottom: "0.5rem", fontWeight: "600" }}>No customers with coordinates</div>
            <div style={{ fontSize: "0.75rem" }}>
              {customers.length} customer(s) found, but none have geocoded addresses.
              <br />
              Click "Geocode Missing Addresses" above to add coordinates.
            </div>
          </div>
        ) : clusters.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>
            No clusters found. Adjust radius or geocode more addresses.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {clusters.map((cluster) => {
              const clusterCustomerIds = cluster.customers.map((c) => c.id);
              const allSelected = clusterCustomerIds.every((id) => selectedCustomerIds.includes(id));
              const someSelected = clusterCustomerIds.some((id) => selectedCustomerIds.includes(id));
              
              return (
                <div
                  key={cluster.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    background: allSelected ? "#f0fdf4" : someSelected ? "#fef3c7" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (allSelected) {
                      handleClusterDeselect(cluster.id);
                    } else {
                      handleClusterSelect(cluster.id);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => {
                        if (allSelected) {
                          handleClusterDeselect(cluster.id);
                        } else {
                          handleClusterSelect(cluster.id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontWeight: "600", fontSize: "0.875rem" }}>
                      {cluster.customers.length} stops
                    </span>
                    {cluster.area && (
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        • {cluster.area}
                      </span>
                    )}
                  </div>
                  {cluster.estimatedRouteMiles && (
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                      Est. route: ~{cluster.estimatedRouteMiles.toFixed(1)} miles
                    </div>
                  )}
                  {selectedCluster === cluster.id && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
                      {cluster.customers.map((customer) => (
                        <div
                          key={customer.id}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.includes(customer.id)}
                            disabled={!canSelectCustomer(customer)}
                            onChange={() => {
                              if (selectedCustomerIds.includes(customer.id)) {
                                onCustomerDeselect(customer.id);
                              } else {
                                if (canSelectCustomer(customer)) {
                                  onCustomerSelect(customer.id);
                                } else {
                                  alert("This customer is assigned to another operator. Enable 'Reassign' to select.");
                                }
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ opacity: canSelectCustomer(customer) ? 1 : 0.5 }}>
                            {customer.name}
                            {customer.assignedTo && customer.assignedTo !== currentOperatorId && (
                              <span style={{ fontSize: "0.7rem", color: "#ef4444", marginLeft: "0.25rem" }}>
                                (Assigned to {customer.assignedToName || "another operator"})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id);
                    }}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {selectedCluster === cluster.id ? "Hide" : "Show"} customers
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              customersWithCoords.forEach((customer) => {
                if (canSelectCustomer(customer) && !selectedCustomerIds.includes(customer.id)) {
                  onCustomerSelect(customer.id);
                }
              });
            }}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid #10b981",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#10b981",
              cursor: "pointer",
            }}
          >
            Select All Visible
          </button>
        </div>
      </div>
    </div>
  );
}
