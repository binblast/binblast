// components/OperatorDashboard/EmployeeDetail/StopList.tsx
"use client";

import { useEffect, useState } from "react";

interface Stop {
  id: string;
  customerName?: string;
  customerEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
}

interface StopListProps {
  employeeId: string;
}

export function StopList({ employeeId }: StopListProps) {
  const [todayStops, setTodayStops] = useState<Stop[]>([]);
  const [upcomingStops, setUpcomingStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStops();
    // Refresh every 30 seconds
    const interval = setInterval(loadStops, 30000);
    return () => clearInterval(interval);
  }, [employeeId]);

  const loadStops = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        setTodayStops(data.todayStops || []);
        setUpcomingStops(data.upcomingStops || []);
      }
    } catch (error) {
      console.error("Error loading stops:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (stop: Stop) => {
    const status = stop.status || stop.jobStatus || "pending";
    const colors: Record<string, { bg: string; color: string }> = {
      completed: { bg: "#d1fae5", color: "#065f46" },
      in_progress: { bg: "#dbeafe", color: "#1e40af" },
      pending: { bg: "#fef3c7", color: "#92400e" },
      failed: { bg: "#fee2e2", color: "#991b1b" },
    };
    const style = colors[status] || colors.pending;
    return (
      <span style={{
        padding: "0.25rem 0.75rem",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading stops...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Stop List
      </h3>

      {/* Today's Stops */}
      <div style={{ marginBottom: "2rem" }}>
        <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
          Today's Stops ({todayStops.length})
        </h4>
        {todayStops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No stops scheduled for today
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Customer
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Address
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    County/City
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Time Window
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayStops.map((stop) => (
                  <tr key={stop.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <div style={{ fontWeight: "600", color: "#111827" }}>
                        {stop.customerName || stop.customerEmail || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.addressLine1 ? `${stop.addressLine1}, ${stop.city}, ${stop.state} ${stop.zipCode}` : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.county || stop.city || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.scheduledTime || "TBD"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {getStatusBadge(stop)}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button style={{
                          padding: "0.25rem 0.5rem",
                          background: "#3b82f6",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}>
                          View
                        </button>
                        <button style={{
                          padding: "0.25rem 0.5rem",
                          background: "#6b7280",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}>
                          Reassign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming Stops */}
      <div>
        <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
          Next 7 Days ({upcomingStops.length})
        </h4>
        {upcomingStops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No upcoming stops scheduled
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Customer
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Address
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Date
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Time
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcomingStops.map((stop) => (
                  <tr key={stop.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <div style={{ fontWeight: "600", color: "#111827" }}>
                        {stop.customerName || stop.customerEmail || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.addressLine1 ? `${stop.addressLine1}, ${stop.city}` : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {formatDate(stop.scheduledDate || "")}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.scheduledTime || "TBD"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {getStatusBadge(stop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

