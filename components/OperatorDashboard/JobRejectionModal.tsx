// components/OperatorDashboard/JobRejectionModal.tsx
// Modal for operators to reject jobs with reason

"use client";

import { useState } from "react";

interface JobRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobAddress?: string;
  onReject: (jobId: string, reason: string) => Promise<void>;
}

export function JobRejectionModal({
  isOpen,
  onClose,
  jobId,
  jobAddress,
  onReject,
}: JobRejectionModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onReject(jobId, rejectionReason.trim());
      setRejectionReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reject job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason("");
      setError(null);
      onClose();
    }
  };

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
        zIndex: 2000,
        padding: "1rem",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Reject Job
        </h2>

        {jobAddress && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}
          >
            {jobAddress}
          </p>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: "#111827",
            }}
          >
            Rejection Reason <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setError(null);
            }}
            placeholder="Explain why this job is being rejected (e.g., missing photos, poor quality, wrong location)..."
            rows={5}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: error ? "2px solid #dc2626" : "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
            disabled={isSubmitting}
          />
          {error && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#991b1b",
              marginBottom: "0.5rem",
            }}
          >
            ⚠ Warning
          </div>
          <div style={{ fontSize: "0.875rem", color: "#991b1b" }}>
            Rejecting this job will mark it as rejected and notify the employee. The job will need to be completed again with proper documentation.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "2px solid #e5e7eb",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#111827",
              background: "#ffffff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !rejectionReason.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#ffffff",
              background: isSubmitting || !rejectionReason.trim() ? "#9ca3af" : "#dc2626",
              cursor: isSubmitting || !rejectionReason.trim() ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Rejecting..." : "Reject Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
