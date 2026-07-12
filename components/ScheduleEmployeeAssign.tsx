"use client";

import { useState, useEffect } from "react";

export interface ScheduleStaffMember {
  id: string;
  name: string;
  role?: string;
}

interface ScheduleEmployeeAssignProps {
  jobId: string;
  staff: ScheduleStaffMember[];
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  disabled?: boolean;
  onAssigned?: () => void;
}

export function ScheduleEmployeeAssign({
  jobId,
  staff,
  assignedEmployeeId = "",
  assignedEmployeeName = "",
  disabled = false,
  onAssigned,
}: ScheduleEmployeeAssignProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(assignedEmployeeId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEmployeeId(assignedEmployeeId || "");
  }, [assignedEmployeeId, jobId]);

  async function handleAssign() {
    if (!selectedEmployeeId) return;

    const employee = staff.find((member) => member.id === selectedEmployeeId);
    if (!employee) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/schedule/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedEmployeeId: employee.id,
          assignedEmployeeName: employee.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign employee");
      }

      onAssigned?.();
    } catch (assignError: unknown) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/schedule/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAssignment: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to unassign employee");
      }

      setSelectedEmployeeId("");
      onAssigned?.();
    } catch (unassignError: unknown) {
      setError(unassignError instanceof Error ? unassignError.message : "Failed to unassign employee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "180px" }}>
      <select
        value={selectedEmployeeId}
        disabled={disabled || saving || staff.length === 0}
        onChange={(e) => setSelectedEmployeeId(e.target.value)}
        style={{
          padding: "0.45rem 0.6rem",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          fontSize: "0.8125rem",
          background: "#ffffff",
        }}
      >
        <option value="">Assign employee...</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={disabled || saving || !selectedEmployeeId}
          onClick={handleAssign}
          style={{
            padding: "0.35rem 0.65rem",
            border: "none",
            borderRadius: "6px",
            background: saving || !selectedEmployeeId ? "#9ca3af" : "#16a34a",
            color: "#ffffff",
            fontSize: "0.75rem",
            fontWeight: "600",
            cursor: saving || !selectedEmployeeId ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Assign"}
        </button>
        {(assignedEmployeeId || selectedEmployeeId) && (
          <button
            type="button"
            disabled={disabled || saving}
            onClick={handleUnassign}
            style={{
              padding: "0.35rem 0.65rem",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Unassign
          </button>
        )}
      </div>

      {assignedEmployeeName && (
        <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: "600" }}>
          Assigned: {assignedEmployeeName}
        </div>
      )}

      {error && <div style={{ fontSize: "0.75rem", color: "#dc2626" }}>{error}</div>}
    </div>
  );
}
