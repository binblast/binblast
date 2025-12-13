// components/OperatorDashboard/EmployeeDetail/CurrentShiftCard.tsx
"use client";

import { useEffect, useState } from "react";

interface ShiftStatus {
  shiftStatus: "not_started" | "clocked_in" | "completed";
  shiftStartTime: any;
  expectedEndTime: any;
  assignedStops: number;
  completedStops: number;
  inProgressStops: number;
  pendingStops: number;
  missedStops: number;
  stopsRemaining: number;
}

interface CurrentShiftCardProps {
  employeeId: string;
}

export function CurrentShiftCard({ employeeId }: CurrentShiftCardProps) {
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShiftStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadShiftStatus, 30000);
    return () => clearInterval(interval);
  }, [employeeId]);

  const loadShiftStatus = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/shift-status`);
      if (response.ok) {
        const data = await response.json();
        setShiftStatus(data);
      }
    } catch (error) {
      console.error("Error loading shift status:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "N/A";
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
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading shift status...</div>
      </div>
    );
  }

  if (!shiftStatus) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#dc2626" }}>Failed to load shift status</div>
      </div>
    );
  }

  const progressPercentage = shiftStatus.assignedStops > 0
    ? (shiftStatus.completedStops / shiftStatus.assignedStops) * 100
    : 0;

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Current Shift Progress
      </h3>

      {/* Shift Status */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Status:</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            padding: "0.25rem 0.75rem",
            borderRadius: "6px",
            background: shiftStatus.shiftStatus === "clocked_in" ? "#d1fae5" : "#f3f4f6",
            color: shiftStatus.shiftStatus === "clocked_in" ? "#065f46" : "#6b7280",
          }}>
            {shiftStatus.shiftStatus === "not_started" ? "Not Started" :
             shiftStatus.shiftStatus === "clocked_in" ? "Clocked In" : "Completed"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Start Time:</span>
          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            {formatTime(shiftStatus.shiftStartTime)}
          </span>
        </div>
        {shiftStatus.expectedEndTime && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Expected End:</span>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
              {formatTime(shiftStatus.expectedEndTime)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            Progress: {shiftStatus.completedStops} / {shiftStatus.assignedStops} stops
          </span>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {shiftStatus.stopsRemaining} remaining
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "24px",
          background: "#f3f4f6",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: "100%",
            background: progressPercentage === 100 ? "#16a34a" : "#3b82f6",
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            {shiftStatus.completedStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Completed
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: shiftStatus.missedStops > 0 ? "#dc2626" : "#6b7280" }}>
            {shiftStatus.missedStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Missed/Late
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#3b82f6" }}>
            {shiftStatus.inProgressStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            In Progress
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f59e0b" }}>
            {shiftStatus.pendingStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Pending
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button style={{
          padding: "0.5rem 1rem",
          background: "#16a34a",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "600",
          cursor: "pointer",
        }}>
          Mark Stop Complete
        </button>
        <button style={{
          padding: "0.5rem 1rem",
          background: "#3b82f6",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "600",
          cursor: "pointer",
        }}>
          Add Note
        </button>
        <button style={{
          padding: "0.5rem 1rem",
          background: "#6b7280",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "600",
          cursor: "pointer",
        }}>
          View Proof
        </button>
      </div>
    </div>
  );
}

