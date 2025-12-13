// components/OperatorDashboard/EmployeeDetail/CustomerAssignmentModule.tsx
"use client";

import { useEffect, useState } from "react";
import { georgiaCounties } from "@/data/gaCounties";

interface Customer {
  id: string;
  name: string;
  email: string;
  county: string;
  city: string;
  address: string;
  plan: string;
  status: string;
}

interface CustomerAssignmentModuleProps {
  employeeId: string;
  onAssign?: () => void;
}

export function CustomerAssignmentModule({ employeeId, onAssign }: CustomerAssignmentModuleProps) {
  const [search, setSearch] = useState("");
  const [filterCounty, setFilterCounty] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterServiceType, setFilterServiceType] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignmentType, setAssignmentType] = useState<"one-time" | "recurring">("one-time");
  const [priority, setPriority] = useState<"normal" | "priority" | "urgent">("normal");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (search || filterCounty || filterCity || filterPlan || filterStatus) {
      searchCustomers();
    }
  }, [search, filterCounty, filterCity, filterPlan, filterStatus, filterServiceType]);

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
    
    // Check county spread
    const uniqueCounties = new Set(selectedCustomerData.map(c => c.county));
    if (uniqueCounties.size > 5) {
      warnings.push(`Stops span ${uniqueCounties.size} counties. Consider splitting into multiple days.`);
    }

    // Check if too many stops
    if (selectedCustomers.length > 30) {
      warnings.push(`Assigning ${selectedCustomers.length} stops. Estimated drive time may exceed 8 hours.`);
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

  const handleAssign = async () => {
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer");
      return;
    }

    setAssigning(true);
    try {
      // For now, assign one-time stops
      // In a full implementation, this would handle recurring assignments
      for (const customerId of selectedCustomers) {
        const response = await fetch(`/api/operator/employees/${employeeId}/stops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cleaningId: customerId,
            priority,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to assign customer ${customerId}`);
        }
      }

      alert(`Successfully assigned ${selectedCustomers.length} customer(s)`);
      setSelectedCustomers([]);
      if (onAssign) onAssign();
    } catch (error: any) {
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
              ⚠️ {warning}
            </div>
          ))}
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

      {/* Customer List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          No customers found. Try adjusting your filters.
        </div>
      ) : (
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
                <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                  {customer.name}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {customer.county || customer.city} — {customer.address} — {customer.plan}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Button */}
      <button
        onClick={handleAssign}
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
        }}
      >
        {assigning ? "Assigning..." : `Assign ${selectedCustomers.length} Customer(s)`}
      </button>
    </div>
  );
}

