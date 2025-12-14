// components/OperatorDashboard/EmployeeDetail/ViewProofModal.tsx
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
  customerName?: string;
  customerEmail?: string;
  completionPhotoUrl?: string;
  employeeNotes?: string;
  operatorNotes?: string;
  binCount?: number;
  completedAt?: any;
  status?: string;
  jobStatus?: string;
}

interface ViewProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

export function ViewProofModal({
  isOpen,
  onClose,
  employeeId,
}: ViewProofModalProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStops();
      setSelectedStopId("");
      setError(null);
    }
  }, [isOpen, employeeId]);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        const todayStops = (data.todayStops || []) as Stop[];
        // Filter to only show completed stops
        const completedStops = todayStops.filter(
          stop => stop.status === "completed" || stop.jobStatus === "completed"
        );
        setStops(completedStops);
        // Pre-select first stop if available
        if (completedStops.length > 0 && !selectedStopId) {
          setSelectedStopId(completedStops[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading stops:", error);
      setError("Failed to load stops");
    } finally {
      setLoading(false);
    }
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

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric",
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch {
      return "N/A";
    }
  };

  const selectedStop = stops.find(s => s.id === selectedStopId);

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
        maxWidth: "700px",
        width: "100%",
        maxHeight: "80vh",
        overflow: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            View Proof of Work
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
            No completed stops available
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                Select Completed Stop
              </label>
              <select
                value={selectedStopId}
                onChange={(e) => setSelectedStopId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="">-- Select a stop --</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {formatAddress(stop)} {stop.scheduledTime ? `(${stop.scheduledTime})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedStop && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Address:</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
                    {formatAddress(selectedStop)}
                  </div>
                </div>

                {selectedStop.completedAt && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Completed At:</div>
                    <div style={{ fontSize: "0.875rem", color: "#111827" }}>
                      {formatTime(selectedStop.completedAt)}
                    </div>
                  </div>
                )}

                {selectedStop.binCount !== undefined && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Bin Count:</div>
                    <div style={{ fontSize: "0.875rem", color: "#111827" }}>
                      {selectedStop.binCount}
                    </div>
                  </div>
                )}

                {selectedStop.completionPhotoUrl ? (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>Proof Photo:</div>
                    <img
                      src={selectedStop.completionPhotoUrl}
                      alt="Proof of completion"
                      style={{
                        width: "100%",
                        maxHeight: "400px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const errorDiv = document.createElement("div");
                        errorDiv.textContent = "Failed to load image";
                        errorDiv.style.padding = "2rem";
                        errorDiv.style.textAlign = "center";
                        errorDiv.style.color = "#6b7280";
                        (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ marginBottom: "1rem", padding: "2rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center", color: "#6b7280" }}>
                    No proof photo available
                  </div>
                )}

                {selectedStop.employeeNotes && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Employee Notes:</div>
                    <div style={{ fontSize: "0.875rem", color: "#111827", padding: "0.75rem", background: "#f9fafb", borderRadius: "6px" }}>
                      {selectedStop.employeeNotes}
                    </div>
                  </div>
                )}

                {selectedStop.operatorNotes && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Operator Notes:</div>
                    <div style={{ fontSize: "0.875rem", color: "#111827", padding: "0.75rem", background: "#f9fafb", borderRadius: "6px" }}>
                      {selectedStop.operatorNotes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
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

