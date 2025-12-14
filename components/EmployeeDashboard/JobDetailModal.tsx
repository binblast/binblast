// components/EmployeeDashboard/JobDetailModal.tsx
"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { IssueFlags } from "./IssueFlags";
import { PhotoUpload } from "./PhotoUpload";
import { StickerConfirmation, StickerStatus } from "./StickerConfirmation";

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
      stickerStatus?: StickerStatus;
      stickerPlaced?: boolean;
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
  const [stickerStatus, setStickerStatus] = useState<StickerStatus>("none");
  const [completionStep, setCompletionStep] = useState<1 | 2 | 3>(1);

  // Reset state when job changes or modal closes
  React.useEffect(() => {
    if (isOpen && job) {
      setBinCount(job.binCount || undefined);
      setEmployeeNotes("");
      setSelectedPhoto(null);
      setPhotoFile(null);
      setStickerStatus("none");
      setCompletionStep(1);
      setError(null);
    }
  }, [isOpen, job?.id]);

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

  const handlePhotoSelect = (file: File, dataUrl: string) => {
    setPhotoFile(file);
    setSelectedPhoto(dataUrl);
    setError(null);
  };

  const handleCompleteJob = async () => {
    // Validate step 1: Photo
    if (!selectedPhoto) {
      setError("Please take a photo of the cleaned bins");
      setCompletionStep(1);
      return;
    }

    // Validate step 2: Sticker status
    if (stickerStatus === "none") {
      setError("Please confirm sticker status");
      setCompletionStep(2);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Upload photo if we have a file
      let photoUrl = selectedPhoto;
      if (photoFile) {
        // For now, use data URL. In production, upload to Firebase Storage
        photoUrl = selectedPhoto;
      }

      await onCompleteJob(job.id, {
        employeeNotes: employeeNotes.trim() || undefined,
        binCount,
        completionPhotoUrl: photoUrl || undefined,
        stickerStatus,
        stickerPlaced: stickerStatus === "placed",
      });
      setEmployeeNotes("");
      setSelectedPhoto(null);
      setPhotoFile(null);
      setStickerStatus("none");
      setCompletionStep(1);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to complete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (completionStep === 1) {
      if (!selectedPhoto) {
        setError("Please take a photo before continuing");
        return;
      }
      setCompletionStep(2);
      setError(null);
    } else if (completionStep === 2) {
      if (stickerStatus === "none") {
        setError("Please select a sticker status");
        return;
      }
      setCompletionStep(3);
      setError(null);
    }
  };

  const handlePreviousStep = () => {
    if (completionStep > 1) {
      setCompletionStep((completionStep - 1) as 1 | 2 | 3);
      setError(null);
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

        {/* Multi-Step Completion Form (if not completed) */}
        {!isCompleted && isInProgress && (
          <>
            {/* Progress Indicator */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Step {completionStep} of 3
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  {Math.round((completionStep / 3) * 100)}% Complete
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#e5e7eb",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(completionStep / 3) * 100}%`,
                    height: "100%",
                    background: "#16a34a",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>

            {/* Step 1: Photo Upload */}
            {completionStep === 1 && (
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#111827",
                  }}
                >
                  Step 1: Take Photo
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  Take a clear photo of the cleaned bins showing your work
                </p>
                <PhotoUpload
                  onPhotoSelect={handlePhotoSelect}
                  currentPhoto={selectedPhoto}
                  required={true}
                  label="Completion Photo"
                />
              </div>
            )}

            {/* Step 2: Sticker Confirmation */}
            {completionStep === 2 && (
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#111827",
                  }}
                >
                  Step 2: Sticker Status
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  Confirm the Bin Blast sticker status for this bin
                </p>
                <StickerConfirmation
                  onStatusChange={setStickerStatus}
                  currentStatus={stickerStatus}
                />
              </div>
            )}

            {/* Step 3: Final Details */}
            {completionStep === 3 && (
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#111827",
                  }}
                >
                  Step 3: Final Details
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  Add any additional notes or update bin count
                </p>

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

                {/* Review Summary */}
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      color: "#111827",
                    }}
                  >
                    Review Summary:
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                    ✓ Photo: {selectedPhoto ? "Uploaded" : "Missing"}
                    <br />
                    ✓ Sticker:{" "}
                    {stickerStatus === "existing"
                      ? "Customer has sticker"
                      : stickerStatus === "placed"
                      ? "Sticker placed"
                      : "No sticker"}
                    <br />
                    ✓ Bins: {binCount || "Not specified"}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Simple form for pending jobs */}
        {!isCompleted && canStart && (
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

          {canComplete && !isCompleted && isInProgress && (
            <>
              {completionStep > 1 && (
                <button
                  onClick={handlePreviousStep}
                  disabled={isSubmitting}
                  style={{
                    minHeight: "48px",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "2px solid #e5e7eb",
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#111827",
                    background: "#ffffff",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  ← Back
                </button>
              )}
              {completionStep < 3 ? (
                <button
                  onClick={handleNextStep}
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
                >
                  Next →
                </button>
              ) : (
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
                >
                  {isSubmitting ? "Completing..." : "✓ Complete Job"}
                </button>
              )}
            </>
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

