// components/OperatorDashboard/EmployeeDetail/CustomerNearbyView.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { sortByDistance, filterWithinRadius, calculateCentroid } from "@/lib/proximity-utils";

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

interface CustomerNearbyViewProps {
  customers: Customer[];
  selectedCustomerIds: string[];
  onCustomerSelect: (customerId: string) => void;
  onCustomerDeselect: (customerId: string) => void;
  currentOperatorId: string;
  operatorStartLocation?: { latitude: number; longitude: number } | null;
  reassignAllowed?: boolean;
}

type AnchorType = "operator" | "customer" | "center";

export function CustomerNearbyView({
  customers,
  selectedCustomerIds,
  onCustomerSelect,
  onCustomerDeselect,
  currentOperatorId,
  operatorStartLocation,
  reassignAllowed = false,
}: CustomerNearbyViewProps) {
  const [anchorType, setAnchorType] = useState<AnchorType>("operator");
  const [selectedAnchorCustomerId, setSelectedAnchorCustomerId] = useState<string | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filter customers with coordinates
  const customersWithCoords = useMemo(() => {
    return customers.filter(
      (c) => c.latitude && c.longitude && c.latitude !== null && c.longitude !== null
    ) as Array<Customer & { latitude: number; longitude: number }>;
  }, [customers]);

  // Calculate anchor point
  const anchorPoint = useMemo(() => {
    if (anchorType === "operator" && operatorStartLocation) {
      return operatorStartLocation;
    }
    if (anchorType === "customer" && selectedAnchorCustomerId) {
      const customer = customersWithCoords.find((c) => c.id === selectedAnchorCustomerId);
      if (customer) {
        return { latitude: customer.latitude, longitude: customer.longitude };
      }
    }
    if (anchorType === "center" && mapCenter) {
      return mapCenter;
    }
    // Fallback: centroid of assigned customers or all customers
    const assignedCustomers = customersWithCoords.filter(
      (c) => c.assignedTo === currentOperatorId
    );
    const customersForCentroid = assignedCustomers.length > 0 ? assignedCustomers : customersWithCoords;
    if (customersForCentroid.length > 0) {
      return calculateCentroid(
        customersForCentroid.map((c) => ({
          latitude: c.latitude,
          longitude: c.longitude,
        }))
      );
    }
    return null;
  }, [anchorType, operatorStartLocation, selectedAnchorCustomerId, mapCenter, customersWithCoords, currentOperatorId]);

  // Sort customers by distance
  const sortedCustomers = useMemo(() => {
    if (!anchorPoint || customersWithCoords.length === 0) {
      return [];
    }

    let filtered = sortByDistance(
      customersWithCoords,
      anchorPoint.latitude,
      anchorPoint.longitude
    );

    // Apply radius filter if set
    if (radiusFilter !== null) {
      filtered = filterWithinRadius(
        filtered,
        anchorPoint.latitude,
        anchorPoint.longitude,
        radiusFilter
      ).map((c) => ({
        ...c,
        distance: sortByDistance([c], anchorPoint.latitude, anchorPoint.longitude)[0].distance,
      }));
    }

    return filtered;
  }, [customersWithCoords, anchorPoint, radiusFilter]);

  const canSelectCustomer = (customer: Customer): boolean => {
    if (customer.assignedTo && customer.assignedTo !== currentOperatorId) {
      return reassignAllowed;
    }
    return true;
  };

  const formatDistance = (miles: number): string => {
    if (miles < 0.1) {
      return `${(miles * 5280).toFixed(0)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  };

  const handleSelectTopN = (n: number) => {
    let count = 0;
    for (const customer of sortedCustomers) {
      if (count >= n) break;
      if (canSelectCustomer(customer) && !selectedCustomerIds.includes(customer.id)) {
        onCustomerSelect(customer.id);
        count++;
      }
    }
  };

  const handleSelectWithinRadius = (radius: number) => {
    if (!anchorPoint) return;
    const withinRadius = filterWithinRadius(
      customersWithCoords,
      anchorPoint.latitude,
      anchorPoint.longitude,
      radius
    );
    withinRadius.forEach((customer) => {
      if (canSelectCustomer(customer) && !selectedCustomerIds.includes(customer.id)) {
        onCustomerSelect(customer.id);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Anchor Point Selector */}
      <div style={{
        padding: "1rem",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        marginBottom: "1rem",
      }}>
        <label style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", display: "block" }}>
          Anchor Point:
        </label>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={anchorType}
            onChange={(e) => {
              setAnchorType(e.target.value as AnchorType);
              if (e.target.value !== "customer") {
                setSelectedAnchorCustomerId(null);
              }
            }}
            style={{
              padding: "0.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="operator">Operator start location</option>
            <option value="customer">Pick a customer</option>
            <option value="center">Map center</option>
          </select>

          {anchorType === "customer" && (
            <select
              value={selectedAnchorCustomerId || ""}
              onChange={(e) => setSelectedAnchorCustomerId(e.target.value || null)}
              style={{
                padding: "0.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                minWidth: "200px",
              }}
            >
              <option value="">Select customer...</option>
              {customersWithCoords.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.city}
                </option>
              ))}
            </select>
          )}

          {anchorPoint && (
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              Anchor: {anchorPoint.latitude.toFixed(4)}, {anchorPoint.longitude.toFixed(4)}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => handleSelectTopN(5)}
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
            Select Top 5
          </button>
          <button
            onClick={() => handleSelectTopN(10)}
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
            Select Top 10
          </button>
          <button
            onClick={() => handleSelectTopN(20)}
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
            Select Top 20
          </button>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.875rem" }}>Within:</label>
            <select
              value={radiusFilter || ""}
              onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) : null)}
              style={{
                padding: "0.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="">All distances</option>
              <option value="1">1 mile</option>
              <option value="3">3 miles</option>
              <option value="5">5 miles</option>
              <option value="10">10 miles</option>
            </select>
            {radiusFilter && (
              <button
                onClick={() => handleSelectWithinRadius(radiusFilter)}
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
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "1rem",
        background: "#ffffff",
      }}>
        {sortedCustomers.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>
            {customersWithCoords.length === 0
              ? "No customers with coordinates available. Geocode addresses to see them."
              : anchorPoint
              ? "No customers found within the selected filters."
              : "Select an anchor point to see nearby customers."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {sortedCustomers.map((customer) => {
              const isSelected = selectedCustomerIds.includes(customer.id);
              const canSelect = canSelectCustomer(customer);
              
              return (
                <div
                  key={customer.id}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    background: isSelected ? "#f0fdf4" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    cursor: canSelect ? "pointer" : "not-allowed",
                    opacity: canSelect ? 1 : 0.6,
                  }}
                  onClick={() => {
                    if (!canSelect) {
                      alert("This customer is assigned to another operator. Enable 'Reassign' to select.");
                      return;
                    }
                    if (isSelected) {
                      onCustomerDeselect(customer.id);
                    } else {
                      onCustomerSelect(customer.id);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (!canSelect) return;
                      if (isSelected) {
                        onCustomerDeselect(customer.id);
                      } else {
                        onCustomerSelect(customer.id);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!canSelect}
                  />
                  <div style={{
                    padding: "0.25rem 0.5rem",
                    background: "#3b82f6",
                    color: "#ffffff",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    minWidth: "60px",
                    textAlign: "center",
                  }}>
                    {formatDistance(customer.distance)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                      {customer.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {customer.address}, {customer.city}{customer.zipCode ? ` ${customer.zipCode}` : ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {customer.plan || "N/A"} • {customer.status || "N/A"}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", textAlign: "right" }}>
                    {customer.assignedTo ? (
                      <div style={{
                        color: customer.assignedTo === currentOperatorId ? "#10b981" : "#ef4444",
                        fontWeight: "600",
                      }}>
                        {customer.assignedTo === currentOperatorId
                          ? "This operator"
                          : customer.assignedToName || "Assigned"}
                      </div>
                    ) : (
                      <div style={{ color: "#3b82f6", fontWeight: "600" }}>Unassigned</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
