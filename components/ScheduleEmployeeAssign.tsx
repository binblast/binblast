"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


import { useEffect, useState } from "react";

export interface ScheduleStaffMember {
  id: string;
  name: string;
  role?: string;
}

export interface ScheduleAssignResult {
  employeeId: string;
  employeeName: string;
  action: "assign" | "unassign";
}

interface ScheduleEmployeeAssignProps {
  jobId: string;
  staff: ScheduleStaffMember[];
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  customerLabel?: string;
  disabled?: boolean;
  onAssigned?: (result?: ScheduleAssignResult) => void;
}

export function ScheduleEmployeeAssign({
  jobId,
  staff,
  assignedEmployeeId = "",
  assignedEmployeeName = "",
  customerLabel,
  disabled = false,
  onAssigned,
}: ScheduleEmployeeAssignProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(assignedEmployeeId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    setSelectedEmployeeId(assignedEmployeeId || "");
  }, [assignedEmployeeId, jobId]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const selectedEmployee = staff.find((member) => member.id === selectedEmployeeId);
  const isAlreadyAssigned =
    !!assignedEmployeeId && !!selectedEmployeeId && selectedEmployeeId === assignedEmployeeId;
  const hasPendingChange =
    !!selectedEmployeeId && selectedEmployeeId !== assignedEmployeeId;

  function showFeedback(tone: "success" | "info", message: string) {
    setFeedback({ tone, message });
    setError(null);
  }

  async function handleAssign() {
    if (!selectedEmployeeId || !selectedEmployee) {
      setError("Select an employee before assigning.");
      return;
    }

    if (isAlreadyAssigned) {
      showFeedback(
        "info",
        `${assignedEmployeeName || selectedEmployee.name} is already assigned to this stop.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetchWithAuth(`/api/admin/schedule/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedEmployeeId: selectedEmployee.id,
          assignedEmployeeName: selectedEmployee.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign employee");
      }

      const label = customerLabel ? `${customerLabel} assigned to ` : "Assigned to ";
      showFeedback("success", `✓ ${label}${selectedEmployee.name}`);
      onAssigned?.({
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        action: "assign",
      });
    } catch (assignError: unknown) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign() {
    if (!assignedEmployeeId && !selectedEmployeeId) {
      setError("No employee is assigned to this stop.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetchWithAuth(`/api/admin/schedule/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAssignment: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to unassign employee");
      }

      setSelectedEmployeeId("");
      const label = customerLabel ? `${customerLabel} unassigned` : "Employee unassigned";
      showFeedback("success", `✓ ${label}`);
      onAssigned?.({
        employeeId: "",
        employeeName: assignedEmployeeName || selectedEmployee?.name || "",
        action: "unassign",
      });
    } catch (unassignError: unknown) {
      setError(unassignError instanceof Error ? unassignError.message : "Failed to unassign employee");
    } finally {
      setSaving(false);
    }
  }

  const assignButtonLabel = saving
    ? "Assigning..."
    : hasPendingChange && selectedEmployee
      ? `Assign to ${selectedEmployee.name}`
      : isAlreadyAssigned
        ? "Assigned"
        : "Assign";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        minWidth: "220px",
        padding: "0.75rem",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
      }}
    >
      <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Route Assignment
      </div>

      {assignedEmployeeName ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.45rem 0.6rem",
            borderRadius: "8px",
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: "0.8125rem",
            fontWeight: "600",
          }}
        >
          <span aria-hidden="true">✓</span>
          <span>Currently: {assignedEmployeeName}</span>
        </div>
      ) : (
        <div
          style={{
            padding: "0.45rem 0.6rem",
            borderRadius: "8px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "0.8125rem",
            fontWeight: "600",
          }}
        >
          No employee assigned yet
        </div>
      )}

      <select
        value={selectedEmployeeId}
        disabled={disabled || saving || staff.length === 0}
        onChange={(e) => {
          setSelectedEmployeeId(e.target.value);
          setError(null);
        }}
        style={{
          padding: "0.55rem 0.65rem",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "0.8125rem",
          background: "#ffffff",
        }}
      >
        <option value="">Choose employee...</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={disabled || saving || !selectedEmployeeId || isAlreadyAssigned}
          onClick={handleAssign}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "0.5rem 0.75rem",
            border: "none",
            borderRadius: "8px",
            background:
              disabled || saving || !selectedEmployeeId || isAlreadyAssigned ? "#9ca3af" : "#16a34a",
            color: "#ffffff",
            fontSize: "0.8125rem",
            fontWeight: "700",
            cursor:
              disabled || saving || !selectedEmployeeId || isAlreadyAssigned
                ? "not-allowed"
                : "pointer",
          }}
        >
          {assignButtonLabel}
        </button>

        {(assignedEmployeeId || selectedEmployeeId) && (
          <button
            type="button"
            disabled={disabled || saving}
            onClick={handleUnassign}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "0.8125rem",
              fontWeight: "700",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Unassign"}
          </button>
        )}
      </div>

      {hasPendingChange && selectedEmployee && !saving && (
        <div style={{ fontSize: "0.75rem", color: "#4b5563" }}>
          Ready to assign <strong>{selectedEmployee.name}</strong> to this stop.
        </div>
      )}

      {feedback && (
        <div
          style={{
            padding: "0.55rem 0.65rem",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            fontWeight: "600",
            background: feedback.tone === "success" ? "#ecfdf5" : "#eff6ff",
            border: `1px solid ${feedback.tone === "success" ? "#bbf7d0" : "#bfdbfe"}`,
            color: feedback.tone === "success" ? "#166534" : "#1d4ed8",
          }}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "0.55rem 0.65rem",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            fontWeight: "600",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
