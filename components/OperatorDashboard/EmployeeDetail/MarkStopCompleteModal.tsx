// components/OperatorDashboard/EmployeeDetail/MarkStopCompleteModal.tsx
"use client";

import { useState, useEffect } from "react";

interface Stop {
  id: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
  customerName?: string;
  customerEmail?: string;
}

interface MarkStopCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onComplete: () => void;
}

export function MarkStopCompleteModal({
  isOpen,
  onClose,
  employeeId,
  onComplete,
}: MarkStopCompleteModalProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStops();
    }
  }, [isOpen, employeeId]);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        const todayStops = (data.todayStops || []) as Stop[];
        // Filter to only show pending and in_progress stops
        const availableStops = todayStops.filter(
          stop => (stop.status === "pending" || stop.status === "in_progress" || 
                   stop.jobStatus === "pending" || stop.jobStatus === "in_progress")
        );
        setStops(availableStops);
      }
    } catch (error) {
      console.error("Error loading stops:", error);
      setError("Failed to load stops");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (stopId: string) => {
    if (!confirm("Are you sure you want to mark this stop as complete?")) {
      return;
    }

    setCompleting(stopId);
    setError(null);

    try {
      // Get current operator's user ID
      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      const operatorId = auth?.currentUser?.uid || "operator";

      const response = await fetch(`/api/operator/jobs/${stopId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || "Failed to mark stop complete");
      }

      // Remove completed stop from list
      setStops(prev => prev.filter(s => s.id !== stopId));
      onComplete(); // Refresh parent component
    } catch (error: any) {
      console.error("Error completing stop:", error);
      setError(error.message || "Failed to mark stop complete");
    } finally {
      setCompleting(null);
    }
  };

  const getStatusBadge = (stop: Stop) => {
    const status = stop.status || stop.jobStatus || "pending";
    const colors: Record<string, { bg: string; color: string }> = {
      in_progress: { bg: "#dbeafe", color: "#1e40af" },
      pending: { bg: "#fef3c7", color: "#92400e" },
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

  const formatAddress = (stop: Stop) => {
    const parts = [
      stop.addressLine1,
      stop.addressLine2,
      stop.city,
      stop.state,
      stop.zipCode,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  if (!isOpen) return null;

  return (
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
      padding: "1rem",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "600px",
        width: "100%",
        maxHeight: "80vh",
        overflow: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            Mark Stop Complete
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
              padding: "0.25rem",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: "0.75rem",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Loading stops...
          </div>
        ) : stops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No pending or in-progress stops available
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {stops.map((stop) => (
              <div
                key={stop.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: completing === stop.id ? "#f9fafb" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                      {stop.customerName || stop.customerEmail || "Customer"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                      {formatAddress(stop)}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {stop.scheduledTime && (
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Scheduled: {stop.scheduledTime}
                        </span>
                      )}
                      {getStatusBadge(stop)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkComplete(stop.id)}
                    disabled={completing === stop.id}
                    style={{
                      padding: "0.5rem 1rem",
                      background: completing === stop.id ? "#9ca3af" : "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: completing === stop.id ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {completing === stop.id ? "Completing..." : "Mark Complete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#6b7280",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

