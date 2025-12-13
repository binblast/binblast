// components/OperatorDashboard/EmployeeDetail/FlagIssueModal.tsx
"use client";

import { useState } from "react";

interface FlagIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function FlagIssueModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: FlagIssueModalProps) {
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [relatedJobId, setRelatedJobId] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const issueTypes = [
    { value: "performance", label: "Performance Issue" },
    { value: "attendance", label: "Attendance Issue" },
    { value: "quality", label: "Quality of Work" },
    { value: "safety", label: "Safety Concern" },
    { value: "communication", label: "Communication Issue" },
    { value: "other", label: "Other" },
  ];

  const handleFlag = async () => {
    if (!issueType || !description.trim()) {
      setError("Issue type and description are required");
      return;
    }

    setFlagging(true);
    setError(null);

    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/flag-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType,
          description: description.trim(),
          severity,
          relatedJobId: relatedJobId.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to flag issue");
      }

      setSuccess(true);
      setTimeout(() => {
        setIssueType("");
        setDescription("");
        setSeverity("medium");
        setRelatedJobId("");
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to flag issue");
    } finally {
      setFlagging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            Flag Issue
          </h2>
          <button
            onClick={onClose}
            disabled={flagging}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: "#6b7280",
              cursor: flagging ? "not-allowed" : "pointer",
              padding: "0.25rem 0.5rem",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            Employee: <strong>{employeeName}</strong>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Issue Type *
          </label>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            disabled={flagging}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="">Select issue type...</option>
            {issueTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            disabled={flagging}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={6}
            disabled={flagging}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
            Related Job ID (Optional)
          </label>
          <input
            type="text"
            value={relatedJobId}
            onChange={(e) => setRelatedJobId(e.target.value)}
            placeholder="Enter job ID if related to a specific job..."
            disabled={flagging}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "0.75rem",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: "0.75rem",
            background: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}>
            Issue flagged successfully! Admin has been notified.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={flagging}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: flagging ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleFlag}
            disabled={flagging || !issueType || !description.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: flagging || !issueType || !description.trim() ? "#9ca3af" : "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: flagging || !issueType || !description.trim() ? "not-allowed" : "pointer",
            }}
          >
            {flagging ? "Flagging..." : "Flag Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

