// components/EmployeeDashboard/JobDetailModal.tsx
"use client";

import { useState } from "react";
import { IssueFlags } from "./IssueFlags";

interface Job {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  binCount?: number;
  planType?: string;
  notes?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  flags?: string[];
  completionPhotoUrl?: string;
  employeeNotes?: string;
  completedAt?: any;
}

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onStartJob: (jobId: string) => Promise<void>;
  onCompleteJob: (
    jobId: string,
    data: {
      completionPhotoUrl?: string;
      employeeNotes?: string;
      binCount?: number;
    }
  ) => Promise<void>;
  onFlagJob: (jobId: string, flag: string) => Promise<void>;
  employeeId: string;
}

export function JobDetailModal({
  job,
  isOpen,
  onClose,
  onStartJob,
  onCompleteJob,
  onFlagJob,
  employeeId,
}: JobDetailModalProps) {
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [binCount, setBinCount] = useState<number | undefined>(
    job?.binCount || undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  if (!isOpen || !job) return null;

  const fullAddress = `${job.addressLine1}${
    job.addressLine2 ? `, ${job.addressLine2}` : ""
  }, ${job.city}, ${job.state} ${job.zipCode}`;

  const isCompleted = job.jobStatus === "completed";
  const isInProgress = job.jobStatus === "in_progress";
  const canStart = job.jobStatus === "pending" || !job.jobStatus;
  const canComplete = isInProgress || isCompleted;

  const handleStartJob = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onStartJob(job.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteJob = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onCompleteJob(job.id, {
        employeeNotes: employeeNotes.trim() || undefined,
        binCount,
        completionPhotoUrl: selectedPhoto || undefined,
      });
      setEmployeeNotes("");
      setSelectedPhoto(null);
      setPhotoFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to complete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlag = async (flag: string) => {
    try {
      await onFlagJob(job.id, flag);
    } catch (err: any) {
      setError(err.message || "Failed to flag job");
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
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#111827",
              }}
            >
              {job.customerName || job.userEmail || "Customer"}
            </h2>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {fullAddress}
            </div>
          </div>
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

        {/* Job Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#6b7280" }}>Bins:</strong>{" "}
              {binCount || "N/A"}
            </div>
            <div>
              <strong style={{ color: "#6b7280" }}>Type:</strong>{" "}
              {job.planType?.toLowerCase().includes("commercial")
                ? "Commercial"
                : "Residential"}
            </div>
            <div>
              <strong style={{ color: "#6b7280" }}>Status:</strong>{" "}
              <span
                style={{
                  textTransform: "capitalize",
                  fontWeight: "600",
                  color:
                    job.jobStatus === "completed"
                      ? "#16a34a"
                      : job.jobStatus === "in_progress"
                      ? "#2563eb"
                      : "#6b7280",
                }}
              >
                {job.jobStatus || "pending"}
              </span>
            </div>
          </div>

          {job.notes && (
            <div
              style={{
                padding: "0.75rem",
                background: "#f9fafb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#6b7280",
              }}
            >
              <strong>Customer Notes:</strong> {job.notes}
            </div>
          )}

          {isCompleted && job.completedAt && (
            <div style={{ fontSize: "0.875rem", color: "#16a34a" }}>
              Completed at:{" "}
              {job.completedAt.toDate
                ? job.completedAt.toDate().toLocaleString()
                : new Date(job.completedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Form Fields (if not completed) */}
        {!isCompleted && (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Number of Bins
              </label>
              <input
                type="number"
                min="1"
                value={binCount || ""}
                onChange={(e) =>
                  setBinCount(
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                disabled={isCompleted}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Job Notes (optional)
              </label>
              <textarea
                value={employeeNotes}
                onChange={(e) => setEmployeeNotes(e.target.value)}
                disabled={isCompleted}
                placeholder="Add any notes about this job..."
                rows={4}
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Completion Photo (optional but recommended)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={isCompleted}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  cursor: isCompleted ? "not-allowed" : "pointer",
                }}
              />
              {selectedPhoto && (
                <div style={{ marginTop: "0.75rem" }}>
                  <img
                    src={selectedPhoto}
                    alt="Completion preview"
                    style={{
                      width: "100%",
                      maxHeight: "300px",
                      objectFit: "contain",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoFile(null);
                    }}
                    style={{
                      marginTop: "0.5rem",
                      minHeight: "44px",
                      padding: "0.75rem 1rem",
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "2px solid #fecaca",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Display uploaded photo if completed */}
        {isCompleted && job.completionPhotoUrl && (
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#111827",
              }}
            >
              Completion Photo
            </div>
            <img
              src={job.completionPhotoUrl}
              alt="Job completion"
              style={{
                width: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            />
          </div>
        )}

        {/* Issue Flags */}
        {!isCompleted && (
          <IssueFlags
            jobId={job.id}
            currentFlags={job.flags || []}
            onFlag={handleFlag}
          />
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#dc2626",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1.5rem",
          }}
        >
          {canStart && (
            <button
              onClick={handleStartJob}
              disabled={isSubmitting}
              style={{
                flex: 1,
                minHeight: "48px",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                fontSize: "1rem",
                fontWeight: "700",
                color: "#ffffff",
                background: "#2563eb",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.2s, transform 0.1s",
              }}
              onMouseDown={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = "scale(0.98)";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isSubmitting ? "Starting..." : "Start Job"}
            </button>
          )}

          {canComplete && !isCompleted && (
            <button
              onClick={handleCompleteJob}
              disabled={isSubmitting}
              style={{
                flex: 1,
                minHeight: "48px",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                fontSize: "1rem",
                fontWeight: "700",
                color: "#ffffff",
                background: "#16a34a",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.2s, transform 0.1s",
              }}
              onMouseDown={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = "scale(0.98)";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isSubmitting ? "Completing..." : "Complete Job"}
            </button>
          )}

          {isCompleted && (
            <div
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                background: "#d1fae5",
                color: "#065f46",
                fontSize: "0.875rem",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Job Completed
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              minHeight: "48px",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "2px solid #e5e7eb",
              fontSize: "1rem",
              fontWeight: "600",
              color: "#111827",
              background: "#ffffff",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

