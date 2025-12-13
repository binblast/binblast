// app/operator/employees/[employeeId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getTodayDateString, formatTime } from "@/lib/employee-utils";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  serviceArea: string[];
  phone?: string;
}

interface FulfilledCustomer {
  id: string;
  customerName?: string;
  customerEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  completedAt?: any;
  planType?: string;
  binCount?: number;
}

interface UnassignedCustomer {
  id: string;
  customerName?: string;
  customerEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  planType?: string;
  binCount?: number;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.employeeId as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [fulfilledCustomers, setFulfilledCustomers] = useState<FulfilledCustomer[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<UnassignedCustomer[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedCleaningIds, setSelectedCleaningIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [editingServiceAreas, setEditingServiceAreas] = useState<string[]>([]);
  const [newServiceArea, setNewServiceArea] = useState<string>("");
  const [savingServiceArea, setSavingServiceArea] = useState(false);
  const [editingServiceArea, setEditingServiceArea] = useState(false);

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
      loadFulfilledCustomers();
    }
  }, [employeeId]);

  useEffect(() => {
    if (selectedDate) {
      loadUnassignedCustomers();
    }
  }, [selectedDate]);

  const loadEmployeeData = async () => {
    try {
      const response = await fetch(`/api/operator/employee-status`);
      if (response.ok) {
        const data = await response.json();
        const foundEmployee = data.employees?.find((emp: any) => emp.id === employeeId);
        if (foundEmployee) {
          // Parse name back to firstName/lastName
          const nameParts = foundEmployee.name.split(" ");
          setEmployee({
            id: foundEmployee.id,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: foundEmployee.email,
            serviceArea: foundEmployee.serviceArea || [],
          });
          setEditingServiceAreas(foundEmployee.serviceArea || []);
        }
      }
    } catch (error) {
      console.error("Error loading employee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFulfilledCustomers = async () => {
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/customers`
      );
      if (response.ok) {
        const data = await response.json();
        setFulfilledCustomers(data.fulfilledCustomers || []);
      }
    } catch (error) {
      console.error("Error loading fulfilled customers:", error);
    }
  };

  const loadUnassignedCustomers = async () => {
    try {
      // Fetch all cleanings for the selected date
      const response = await fetch(
        `/api/operator/unassigned-customers?date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setUnassignedCustomers(data.customers || []);
      } else {
        // If API doesn't exist, fetch from scheduledCleanings directly
        // For now, set empty array
        setUnassignedCustomers([]);
      }
    } catch (error) {
      console.error("Error loading unassigned customers:", error);
      setUnassignedCustomers([]);
    }
  };

  const handleAssignCustomers = async () => {
    if (selectedCleaningIds.length === 0) {
      alert("Please select at least one customer to assign");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/assign-customers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cleaningIds: selectedCleaningIds,
            date: selectedDate,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign customers");
      }

      const data = await response.json();
      alert(data.message || "Customers assigned successfully");
      
      // Refresh data
      setSelectedCleaningIds([]);
      await loadUnassignedCustomers();
      await loadFulfilledCustomers();
    } catch (error: any) {
      alert(error.message || "Failed to assign customers");
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveServiceArea = async () => {
    setSavingServiceArea(true);
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/service-area`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceArea: editingServiceAreas,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update");
      }

      await loadEmployeeData();
      setEditingServiceArea(false);
      setNewServiceArea("");
    } catch (error: any) {
      alert(error.message || "Failed to update service area");
    } finally {
      setSavingServiceArea(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCompletionDate = (completedAt: any) => {
    if (!completedAt) return "N/A";
    try {
      const date = completedAt.toDate ? completedAt.toDate() : new Date(completedAt);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </main>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#dc2626" }}>Employee not found</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Back Button and Header */}
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  cursor: "pointer",
                  marginBottom: "1rem",
                }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}>
                {employee.firstName} {employee.lastName}
              </h1>
              <p style={{ fontSize: "1rem", color: "#6b7280", marginTop: "0.5rem" }}>
                {employee.email}
              </p>
            </div>

            {/* Employee Info Card */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "2rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
                Employee Information
              </h2>

              {/* Service Areas */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>
                    Service Areas
                  </h3>
                  {!editingServiceArea && (
                    <button
                      onClick={() => setEditingServiceArea(true)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingServiceArea ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                      }}
                    >
                      {editingServiceAreas.map((area, index) => (
                        <span
                          key={index}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.5rem 0.75rem",
                            background: "#f3f4f6",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                          }}
                        >
                          {area}
                          <button
                            onClick={() => {
                              setEditingServiceAreas(
                                editingServiceAreas.filter((_, i) => i !== index)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "1rem",
                              padding: "0",
                              marginLeft: "0.25rem",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                      <input
                        type="text"
                        value={newServiceArea}
                        onChange={(e) => setNewServiceArea(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && newServiceArea.trim()) {
                            setEditingServiceAreas([
                              ...editingServiceAreas,
                              newServiceArea.trim(),
                            ]);
                            setNewServiceArea("");
                          }
                        }}
                        placeholder="Add service area..."
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newServiceArea.trim()) {
                            setEditingServiceAreas([
                              ...editingServiceAreas,
                              newServiceArea.trim(),
                            ]);
                            setNewServiceArea("");
                          }
                        }}
                        disabled={!newServiceArea.trim()}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: newServiceArea.trim() ? "pointer" : "not-allowed",
                          opacity: newServiceArea.trim() ? 1 : 0.5,
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleSaveServiceArea}
                        disabled={savingServiceArea}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: savingServiceArea ? "not-allowed" : "pointer",
                          opacity: savingServiceArea ? 0.5 : 1,
                        }}
                      >
                        {savingServiceArea ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingServiceArea(false);
                          setEditingServiceAreas(employee.serviceArea);
                          setNewServiceArea("");
                        }}
                        disabled={savingServiceArea}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "#6b7280",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: savingServiceArea ? "not-allowed" : "pointer",
                          opacity: savingServiceArea ? 0.5 : 1,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {employee.serviceArea.length > 0
                      ? employee.serviceArea.join(", ")
                      : "No service areas assigned"}
                  </div>
                )}
              </div>
            </div>

            {/* Fulfilled Customers Section */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "2rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
                Fulfilled Customers
              </h2>

              {fulfilledCustomers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No completed cleanings found.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                          Customer
                        </th>
                        <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                          Address
                        </th>
                        <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                          Scheduled Date
                        </th>
                        <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                          Completed At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fulfilledCustomers.map((customer) => (
                        <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "1rem", fontSize: "0.95rem" }}>
                            <div style={{ fontWeight: "600", color: "#111827" }}>
                              {customer.customerName || customer.customerEmail || "N/A"}
                            </div>
                            {customer.customerEmail && customer.customerName && (
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                {customer.customerEmail}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                            {customer.addressLine1
                              ? `${customer.addressLine1}, ${customer.city}, ${customer.state} ${customer.zipCode}`
                              : "N/A"}
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                            {formatDate(customer.scheduledDate || "")}
                            {customer.scheduledTime && ` • ${customer.scheduledTime}`}
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                            {formatCompletionDate(customer.completedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assign Customers Section */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "2rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
                Assign Customers
              </h2>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedCleaningIds([]);
                  }}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              {unassignedCustomers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No unassigned customers found for {formatDate(selectedDate)}.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        {selectedCleaningIds.length} customer(s) selected
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => {
                            if (selectedCleaningIds.length === unassignedCustomers.length) {
                              setSelectedCleaningIds([]);
                            } else {
                              setSelectedCleaningIds(unassignedCustomers.map(c => c.id));
                            }
                          }}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "transparent",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            cursor: "pointer",
                          }}
                        >
                          {selectedCleaningIds.length === unassignedCustomers.length ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                      {unassignedCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          style={{
                            padding: "1rem",
                            borderBottom: "1px solid #f3f4f6",
                            display: "flex",
                            alignItems: "start",
                            gap: "1rem",
                            background: selectedCleaningIds.includes(customer.id) ? "#f0fdf4" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCleaningIds.includes(customer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCleaningIds([...selectedCleaningIds, customer.id]);
                              } else {
                                setSelectedCleaningIds(selectedCleaningIds.filter(id => id !== customer.id));
                              }
                            }}
                            style={{ marginTop: "0.25rem" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                              {customer.customerName || customer.customerEmail || "N/A"}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                              {customer.addressLine1
                                ? `${customer.addressLine1}, ${customer.city}, ${customer.state} ${customer.zipCode}`
                                : "N/A"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                              {customer.scheduledTime || "TBD"} • {customer.planType || "N/A"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAssignCustomers}
                    disabled={selectedCleaningIds.length === 0 || assigning}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: selectedCleaningIds.length === 0 ? "#9ca3af" : "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      cursor: selectedCleaningIds.length === 0 || assigning ? "not-allowed" : "pointer",
                      opacity: assigning ? 0.5 : 1,
                    }}
                  >
                    {assigning ? "Assigning..." : `Assign ${selectedCleaningIds.length} Customer(s)`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

