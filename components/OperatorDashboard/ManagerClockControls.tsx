"use client";

import { useState } from "react";

interface ManagerClockControlsProps {
  employeeId: string;
  employeeName: string;
  isClockedIn: boolean;
  managerId?: string;
  managerEmail?: string;
  managerRole?: string;
  onUpdated?: () => void;
  compact?: boolean;
  inline?: boolean;
}

export function ManagerClockControls({
  employeeId,
  employeeName,
  isClockedIn,
  managerId,
  managerEmail,
  managerRole,
  onUpdated,
  compact = false,
  inline = false,
}: ManagerClockControlsProps) {
  const [working, setWorking] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClockIn(event: React.MouseEvent) {
    event.stopPropagation();
    setWorking("in");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId,
          managerEmail,
          managerRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to clock in employee");
      }
      setMessage(`${employeeName} clocked in`);
      onUpdated?.();
    } catch (clockInError: unknown) {
      setError(clockInError instanceof Error ? clockInError.message : "Failed to clock in employee");
    } finally {
      setWorking(null);
    }
  }

  async function handleClockOut(event: React.MouseEvent) {
    event.stopPropagation();
    setWorking("out");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId,
          managerEmail,
          managerRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to clock out employee");
      }
      setMessage(`${employeeName} clocked out`);
      onUpdated?.();
    } catch (clockOutError: unknown) {
      setError(clockOutError instanceof Error ? clockOutError.message : "Failed to clock out employee");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div onClick={(event) => event.stopPropagation()} style={{ width: inline ? "100%" : undefined }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: compact && !inline ? "0.5rem" : "0" }}>
        {!isClockedIn ? (
          <button
            type="button"
            onClick={handleClockIn}
            disabled={working !== null}
            style={{
              padding: compact ? "0.5rem 0.875rem" : "0.625rem 1rem",
              background: working === "in" ? "#86efac" : "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: compact ? "0.75rem" : "0.875rem",
              fontWeight: "600",
              cursor: working !== null ? "not-allowed" : "pointer",
              width: inline || !compact ? "100%" : "auto",
              minHeight: "44px",
            }}
          >
            {working === "in" ? "Clocking In..." : inline ? "Clock In Employee" : "Clock In"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClockOut}
            disabled={working !== null}
            style={{
              padding: compact ? "0.5rem 0.875rem" : "0.625rem 1rem",
              background: working === "out" ? "#fca5a5" : "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: compact ? "0.75rem" : "0.875rem",
              fontWeight: "600",
              cursor: working !== null ? "not-allowed" : "pointer",
              width: inline || !compact ? "100%" : "auto",
              minHeight: "44px",
            }}
          >
            {working === "out" ? "Clocking Out..." : inline ? "Clock Out Employee" : "Clock Out"}
          </button>
        )}
      </div>
      {message && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#166534", fontWeight: "600" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#dc2626", fontWeight: "600" }}>
          {error}
        </div>
      )}
    </div>
  );
}
