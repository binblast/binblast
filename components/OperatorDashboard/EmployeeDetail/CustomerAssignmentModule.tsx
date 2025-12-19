// components/OperatorDashboard/EmployeeDetail/CustomerAssignmentModule.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { georgiaCounties } from "@/data/gaCounties";
import { ViewToggle } from "./ViewToggle";
import { CustomerMapView } from "./CustomerMapView";
import { CustomerNearbyView } from "./CustomerNearbyView";
import { AssignmentConfirmationModal } from "./AssignmentConfirmationModal";

interface Customer {
  id: string;
  name: string;
  email: string;
  county: string;
  city: string;
  address: string;
  plan: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  zipCode?: string;
  addressLine2?: string;
  state?: string;
}

interface CustomerAssignmentModuleProps {
  employeeId: string;
  onAssign?: () => void;
}

interface CustomerWithAssignment extends Customer {
  assignedTo?: string;
  assignedToName?: string;
  assignmentSource?: string;
  matchesZone?: boolean;
}

export function CustomerAssignmentModule({ employeeId, onAssign }: CustomerAssignmentModuleProps) {
  const [search, setSearch] = useState("");
  const [filterCounty, setFilterCounty] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterServiceType, setFilterServiceType] = useState("");
  const [filterByZone, setFilterByZone] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithAssignment[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignmentType, setAssignmentType] = useState<"one-time" | "recurring">("one-time");
  const [priority, setPriority] = useState<"normal" | "priority" | "urgent">("normal");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [workload, setWorkload] = useState<{
    totalCustomers: number;
    capacityUtilization: number;
  } | null>(null);
  const [employeeZones, setEmployeeZones] = useState<string[]>([]);
  const [employeeCounties, setEmployeeCounties] = useState<string[]>([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{
    id: string;
    name: string;
    currentCustomers: number;
    availableCapacity: number;
  }>>([]);
  const [reassigning, setReassigning] = useState(false);
  
  // New proximity view state
  const [currentView, setCurrentView] = useState<"list" | "map" | "nearby">("list");
  const [operatorStartLocation, setOperatorStartLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocodingCustomers, setGeocodingCustomers] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadEmployeeCoverage();
    loadWorkload();
    loadOperatorLocation();
    loadOperatorName();
  }, [employeeId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search || filterCounty || filterCity || filterPlan || filterStatus || filterByZone) {
        searchCustomers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterCounty, filterCity, filterPlan, filterStatus, filterServiceType, filterByZone, employeeZones, employeeCounties]);

  const loadOperatorLocation = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/location`);
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          setOperatorStartLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          });
        }
      }
    } catch (error) {
      console.error("Error loading operator location:", error);
    }
  };

  const loadOperatorName = async () => {
    try {
      const response = await fetch(`/api/operator/employee-status`);
      if (response.ok) {
        const data = await response.json();
        const foundEmployee = data.employees?.find((emp: any) => emp.id === employeeId);
        if (foundEmployee) {
          setOperatorName(foundEmployee.name || "");
        }
      }
    } catch (error) {
      console.error("Error loading operator name:", error);
    }
  };

  const handleGeocodeCustomers = async () => {
    const customersWithoutCoords = customers.filter(
      (c) => !c.latitude || !c.longitude
    );
    
    if (customersWithoutCoords.length === 0) {
      alert("All customers already have coordinates.");
      return;
    }

    setGeocodingCustomers(true);
    try {
      const response = await fetch("/api/operator/customers/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: customersWithoutCoords.map((c) => c.id),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh customers to get updated coordinates
        await searchCustomers();
        alert(`Geocoded ${data.summary.geocoded} customer(s). ${data.summary.failed} failed.`);
      } else {
        throw new Error("Failed to geocode customers");
      }
    } catch (error: any) {
      console.error("Error geocoding customers:", error);
      alert(error.message || "Failed to geocode customers");
    } finally {
      setGeocodingCustomers(false);
    }
  };

  const loadEmployeeCoverage = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/coverage`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeZones(data.zones || []);
        setEmployeeCounties(data.counties || []);
      }
    } catch (error) {
      console.error("Error loading employee coverage:", error);
    }
  };

  const loadWorkload = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/workload`);
      if (response.ok) {
        const data = await response.json();
        setWorkload(data.workload);
      }
    } catch (error) {
      console.error("Error loading workload:", error);
    }
  };

  const loadAvailableEmployees = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/reassign`);
      if (response.ok) {
        const data = await response.json();
        setAvailableEmployees(data.availableEmployees || []);
      }
    } catch (error) {
      console.error("Error loading available employees:", error);
    }
  };

  const handleReassign = async (targetEmployeeId: string) => {
    if (selectedCustomers.length === 0) {
      alert("Please select customers to reassign");
      return;
    }

    setReassigning(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: selectedCustomers,
          targetEmployeeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reassign customers");
      }

      const data = await response.json();
      alert(`Successfully reassigned ${data.reassigned.length} customer(s)`);
      setSelectedCustomers([]);
      setShowReassignModal(false);
      loadWorkload();
      searchCustomers();
      if (onAssign) onAssign();
    } catch (error: any) {
      alert(error.message || "Failed to reassign customers");
    } finally {
      setReassigning(false);
    }
  };

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCounty) params.append("county", filterCounty);
      if (filterCity) params.append("city", filterCity);
      if (filterPlan) params.append("plan", filterPlan);
      if (filterStatus) params.append("status", filterStatus);
      if (filterServiceType) params.append("serviceType", filterServiceType);
      
      // Add zone/county filtering if enabled
      if (filterByZone && employeeZones.length > 0) {
        params.append("zones", employeeZones.join(","));
      }
      if (filterByZone && employeeCounties.length > 0) {
        params.append("counties", employeeCounties.join(","));
      }

      const response = await fetch(`/api/operator/customers/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateAssignment = () => {
    const warnings: string[] = [];
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
    
    // Check workload capacity
    if (workload) {
      const newTotal = workload.totalCustomers + selectedCustomers.length;
      const newUtilization = (newTotal / 40) * 100;
      
      if (newTotal > 40) {
        warnings.push(`Overload Warning: This will assign ${newTotal} customers (${newUtilization.toFixed(0)}% capacity). Consider reassigning some customers.`);
      } else if (newUtilization > 80) {
        warnings.push(`High Capacity: This will reach ${newUtilization.toFixed(0)}% capacity. Monitor workload closely.`);
      }
    }

    // Check county spread
    const uniqueCounties = new Set(selectedCustomerData.map(c => c.county));
    if (uniqueCounties.size > 5) {
      warnings.push(`Stops span ${uniqueCounties.size} counties. Consider splitting into multiple days.`);
    }

    // Check if too many stops
    if (selectedCustomers.length > 30) {
      warnings.push(`Assigning ${selectedCustomers.length} stops. Estimated drive time may exceed 8 hours.`);
    }

    // Check for customers not matching zones
    const nonMatchingCustomers = selectedCustomerData.filter(c => c.matchesZone === false);
    if (nonMatchingCustomers.length > 0 && filterByZone) {
      warnings.push(`${nonMatchingCustomers.length} customer(s) don't match assigned zones. Consider adjusting coverage.`);
    }

    setWarnings(warnings);
  };

  useEffect(() => {
    if (selectedCustomers.length > 0) {
      validateAssignment();
    } else {
      setWarnings([]);
    }
  }, [selectedCustomers, customers]);

  const handleAssignClick = () => {
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer");
      return;
    }
    // Check if any selected customers are assigned to others
    const selectedCustomerData = customers.filter((c) => selectedCustomers.includes(c.id));
    const hasReassignments = selectedCustomerData.some(
      (c) => c.assignedTo && c.assignedTo !== employeeId
    );
    setShowAssignmentModal(true);
  };

  const handleAssignConfirm = async (reassign: boolean) => {
    if (selectedCustomers.length === 0) {
      return;
    }

    // Filter out customers assigned to others if reassign is false
    let customersToAssign = selectedCustomers;
    if (!reassign) {
      const selectedCustomerData = customers.filter((c) => selectedCustomers.includes(c.id));
      customersToAssign = selectedCustomerData
        .filter((c) => !c.assignedTo || c.assignedTo === employeeId)
        .map((c) => c.id);
    }

    if (customersToAssign.length === 0) {
      alert("No customers to assign. Enable 'Reassign' to include customers assigned to others.");
      setShowAssignmentModal(false);
      return;
    }

    setAssigning(true);
    setShowAssignmentModal(false);
    try {
      // First, find the scheduled cleaning documents for these customers via API
      // This avoids Firestore permission issues by querying server-side
      const cleaningsResponse = await fetch(`/api/operator/cleanings/by-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerUserIds: selectedCustomers,
        }),
      });

      if (!cleaningsResponse.ok) {
        const errorData = await cleaningsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get cleanings for customers");
      }

      const cleaningsData = await cleaningsResponse.json();
      const validCleanings = cleaningsData.cleanings || [];
      
      // Filter cleanings based on reassign flag
      let cleaningsToAssign = validCleanings;
      if (!reassign) {
        cleaningsToAssign = validCleanings.filter((c: any) => 
          !c.assignedEmployeeId || c.assignedEmployeeId === employeeId
        );
      }
      
      // If no cleanings after filtering, use all valid cleanings
      if (cleaningsToAssign.length === 0) {
        cleaningsToAssign = validCleanings;
      }
      
      if (cleaningsToAssign.length === 0) {
        alert("No scheduled cleanings found for the selected customers. Please ensure customers have upcoming cleanings scheduled.");
        setAssigning(false);
        return;
      }

      if (cleaningsToAssign.length < customersToAssign.length) {
        const missingCount = customersToAssign.length - cleaningsToAssign.length;
        alert(`Warning: ${missingCount} customer(s) don't have scheduled cleanings. Assigning ${cleaningsToAssign.length} cleaning(s).`);
      }

      // Now assign each cleaning
      for (const cleaning of cleaningsToAssign) {
        const response = await fetch(`/api/operator/employees/${employeeId}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cleaningId: cleaning.id,
            priority,
            assignmentSource: "manual",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to assign cleaning ${cleaning.id}`);
        }
      }
      
      // Refresh workload after assignment
      loadWorkload();

      alert(`Successfully assigned ${validCleanings.length} cleaning(s)`);
      setSelectedCustomers([]);
      if (onAssign) onAssign();
    } catch (error: any) {
      console.error("Error assigning customers:", error);
      alert(error.message || "Failed to assign customers");
    } finally {
      setAssigning(false);
    }
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleCustomerSelect = (customerId: string) => {
    if (!selectedCustomers.includes(customerId)) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    }
  };

  const handleCustomerDeselect = (customerId: string) => {
    setSelectedCustomers(selectedCustomers.filter((id) => id !== customerId));
  };

  const selectedCustomerData = customers.filter((c) => selectedCustomers.includes(c.id));
  const hasReassignments = selectedCustomerData.some(
    (c) => c.assignedTo && c.assignedTo !== employeeId
  );
  
  // Check if user is admin (for reassign permission)
  useEffect(() => {
    // Check user role from auth context or API
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.role === "admin" || data.role === "operator");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    checkAdmin();
  }, []);

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Assign Customers / Stops
      </h3>

      {/* Workload Indicator */}
      {workload && (
        <div style={{
          padding: "0.75rem 1rem",
          background: workload.capacityUtilization > 80 ? "#fef3c7" : workload.capacityUtilization > 60 ? "#f0f9ff" : "#f0fdf4",
          border: `1px solid ${workload.capacityUtilization > 80 ? "#f59e0b" : workload.capacityUtilization > 60 ? "#3b82f6" : "#10b981"}`,
          borderRadius: "6px",
          marginBottom: "1rem",
          fontSize: "0.875rem",
        }}>
          <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
            Current Workload: {workload.totalCustomers} customers ({workload.capacityUtilization.toFixed(0)}% capacity)
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Capacity: {workload.totalCustomers}/40 customers
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        />

        {/* Filter by Zone Checkbox */}
        {(employeeZones.length > 0 || employeeCounties.length > 0) && (
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#374151",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={filterByZone}
              onChange={(e) => setFilterByZone(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span>Show only customers matching assigned zones/counties</span>
          </label>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
        }}>
          <select
            value={filterCounty}
            onChange={(e) => setFilterCounty(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All Counties</option>
            {georgiaCounties.map(county => (
              <option key={county.name} value={county.name}>{county.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="City..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          />

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All Plans</option>
            <option value="monthly_35">Monthly $35</option>
            <option value="biweekly_65">Bi-weekly $65</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          padding: "1rem",
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "6px",
          marginBottom: "1rem",
        }}>
          {warnings.map((warning, idx) => (
            <div key={idx} style={{ fontSize: "0.875rem", color: "#92400e", marginBottom: "0.25rem" }}>
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* View Toggle */}
      <ViewToggle currentView={currentView} onViewChange={setCurrentView} />

      {/* Geocode Button (for Map/Nearby views) */}
      {(currentView === "map" || currentView === "nearby") && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handleGeocodeCustomers}
            disabled={geocodingCustomers}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "1px solid #3b82f6",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#3b82f6",
              cursor: geocodingCustomers ? "not-allowed" : "pointer",
              opacity: geocodingCustomers ? 0.5 : 1,
            }}
          >
            {geocodingCustomers ? "Geocoding..." : "Geocode Missing Addresses"}
          </button>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            {customers.filter((c) => c.latitude && c.longitude).length} / {customers.length} customers geocoded
          </div>
        </div>
      )}

      {/* Assignment Options */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="radio"
              checked={assignmentType === "one-time"}
              onChange={() => setAssignmentType("one-time")}
            />
            <span style={{ fontSize: "0.875rem" }}>One-time</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="radio"
              checked={assignmentType === "recurring"}
              onChange={() => setAssignmentType("recurring")}
            />
            <span style={{ fontSize: "0.875rem" }}>Recurring</span>
          </label>
        </div>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          style={{
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          <option value="normal">Normal Priority</option>
          <option value="priority">Priority</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Customer Views */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          No customers found. Try adjusting your filters.
        </div>
      ) : (
        <>
          {currentView === "list" && (
            <div style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              marginBottom: "1rem",
            }}>
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    alignItems: "start",
                    gap: "1rem",
                    background: selectedCustomers.includes(customer.id) ? "#f0fdf4" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleCustomer(customer.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => toggleCustomer(customer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: "600", color: "#111827" }}>
                        {customer.name}
                      </span>
                      {customer.assignmentSource && (
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                          background: customer.assignmentSource === "auto" ? "#dbeafe" : "#f3f4f6",
                          color: customer.assignmentSource === "auto" ? "#1e40af" : "#6b7280",
                        }}>
                          {customer.assignmentSource === "auto" ? "Auto" : "Manual"}
                        </span>
                      )}
                      {customer.matchesZone === false && (
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                          background: "#fee2e2",
                          color: "#991b1b",
                        }}>
                          Outside Zone
                        </span>
                      )}
                      {customer.assignedTo && customer.assignedTo !== employeeId && (
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                          background: "#fef3c7",
                          color: "#92400e",
                        }}>
                          Assigned to {customer.assignedToName || "Another Employee"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {customer.county || customer.city} — {customer.address} — {customer.plan}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentView === "map" && (
            <div style={{ height: "600px", marginBottom: "1rem" }}>
              <CustomerMapView
                customers={customers}
                selectedCustomerIds={selectedCustomers}
                onCustomerSelect={handleCustomerSelect}
                onCustomerDeselect={handleCustomerDeselect}
                currentOperatorId={employeeId}
                reassignAllowed={isAdmin}
              />
            </div>
          )}

          {currentView === "nearby" && (
            <div style={{ height: "600px", marginBottom: "1rem" }}>
              <CustomerNearbyView
                customers={customers}
                selectedCustomerIds={selectedCustomers}
                onCustomerSelect={handleCustomerSelect}
                onCustomerDeselect={handleCustomerDeselect}
                currentOperatorId={employeeId}
                operatorStartLocation={operatorStartLocation}
                reassignAllowed={isAdmin}
              />
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "1rem" }}>
        {workload && workload.capacityUtilization > 80 && selectedCustomers.length > 0 && (
          <button
            onClick={() => {
              loadAvailableEmployees();
              setShowReassignModal(true);
            }}
            disabled={selectedCustomers.length === 0}
            style={{
              padding: "0.75rem 1.5rem",
              background: selectedCustomers.length === 0 ? "#9ca3af" : "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: selectedCustomers.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Reassign {selectedCustomers.length} Customer(s)
          </button>
        )}
        <button
          onClick={handleAssignClick}
          disabled={selectedCustomers.length === 0 || assigning}
          style={{
            padding: "0.75rem 1.5rem",
            background: selectedCustomers.length === 0 || assigning ? "#9ca3af" : "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.95rem",
            fontWeight: "600",
            cursor: selectedCustomers.length === 0 || assigning ? "not-allowed" : "pointer",
            opacity: assigning ? 0.5 : 1,
            flex: 1,
          }}
        >
          {assigning ? "Assigning..." : `Assign ${selectedCustomers.length} Customer(s)`}
        </button>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>
              Reassign {selectedCustomers.length} Customer(s)
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
              Select an employee to reassign these customers to:
            </p>
            {availableEmployees.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                No available employees found in same zones
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {availableEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleReassign(emp.id)}
                    disabled={reassigning || emp.availableCapacity < selectedCustomers.length}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      background: emp.availableCapacity < selectedCustomers.length ? "#f3f4f6" : "#ffffff",
                      textAlign: "left",
                      cursor: reassigning || emp.availableCapacity < selectedCustomers.length ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{emp.name}</div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {emp.currentCustomers} customers • {emp.availableCapacity} available capacity
                      {emp.availableCapacity < selectedCustomers.length && (
                        <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                          (Insufficient capacity)
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowReassignModal(false)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#6b7280",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assignment Confirmation Modal */}
      <AssignmentConfirmationModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onConfirm={handleAssignConfirm}
        operatorName={operatorName || "Operator"}
        selectedCount={selectedCustomers.length}
        hasReassignments={hasReassignments}
        reassignAllowed={isAdmin}
        warnings={warnings}
      />
    </div>
  );
}

