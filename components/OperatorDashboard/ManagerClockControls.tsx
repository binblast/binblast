"use client";

import { useState } from "react";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";

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
      {!isClockedIn ? (
        <OperatorActionButton
          variant="success"
          fullWidth={inline || !compact}
          disabled={working !== null}
          onClick={handleClockIn}
        >
          {working === "in" ? "Clocking In..." : inline ? "Clock In Employee" : "Clock In"}
        </OperatorActionButton>
      ) : (
        <OperatorActionButton
          variant="danger"
          fullWidth={inline || !compact}
          disabled={working !== null}
          onClick={handleClockOut}
        >
          {working === "out" ? "Clocking Out..." : inline ? "Clock Out Employee" : "Clock Out"}
        </OperatorActionButton>
      )}
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
