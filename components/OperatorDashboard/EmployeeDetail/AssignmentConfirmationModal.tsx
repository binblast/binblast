// components/OperatorDashboard/EmployeeDetail/AssignmentConfirmationModal.tsx
"use client";

import { useState } from "react";

interface AssignmentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reassign: boolean) => void;
  operatorName: string;
  selectedCount: number;
  hasReassignments: boolean;
  reassignAllowed: boolean;
  warnings?: string[];
}

export function AssignmentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  operatorName,
  selectedCount,
  hasReassignments,
  reassignAllowed,
  warnings = [],
}: AssignmentConfirmationModalProps) {
  const [reassign, setReassign] = useState(false);

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
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "500px",
        width: "90%",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      }}>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#111827",
        }}>
          Confirm Assignment
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            Assign to: <span style={{ fontWeight: "600", color: "#111827" }}>{operatorName}</span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Stops: <span style={{ fontWeight: "600", color: "#111827" }}>{selectedCount}</span>
          </div>
        </div>

        {hasReassignments && (
          <div style={{
            padding: "0.75rem",
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}>
            <div style={{ fontSize: "0.875rem", color: "#92400e", marginBottom: "0.5rem" }}>
              ⚠️ Some customers are already assigned to other operators.
            </div>
            {reassignAllowed ? (
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={reassign}
                  onChange={(e) => setReassign(e.target.checked)}
                />
                <span style={{ fontSize: "0.875rem", color: "#92400e" }}>
                  Reassign these customers to {operatorName}
                </span>
              </label>
            ) : (
              <div style={{ fontSize: "0.875rem", color: "#dc2626" }}>
                Reassignment is not allowed. Please deselect these customers.
              </div>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{
            padding: "0.75rem",
            background: "#f0f9ff",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}>
            <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.5rem" }}>
              Warnings:
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", color: "#1e40af" }}>
              {warnings.map((warning, idx) => (
                <li key={idx} style={{ marginBottom: "0.25rem" }}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (hasReassignments && !reassignAllowed) {
                return; // Cannot proceed
              }
              onConfirm(reassign);
            }}
            disabled={hasReassignments && !reassignAllowed && !reassign}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              background: hasReassignments && !reassignAllowed && !reassign ? "#9ca3af" : "#10b981",
              color: "#ffffff",
              cursor: hasReassignments && !reassignAllowed && !reassign ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
