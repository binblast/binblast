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
      insidePhotoUrl?: string;
      outsidePhotoUrl?: string;
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
  const [insidePhoto, setInsidePhoto] = useState<string | null>(null);
  const [insidePhotoFile, setInsidePhotoFile] = useState<File | null>(null);
  const [outsidePhoto, setOutsidePhoto] = useState<string | null>(null);
  const [outsidePhotoFile, setOutsidePhotoFile] = useState<File | null>(null);
  const [stickerStatus, setStickerStatus] = useState<StickerStatus>("none");
  const [completionStep, setCompletionStep] = useState<1 | 2 | 3>(1);
  const [photoDocumentationCompleted, setPhotoDocumentationCompleted] = useState(false);

  // Reset state when job changes or modal closes
  React.useEffect(() => {
    if (isOpen && job) {
      setBinCount(job.binCount || undefined);
      setEmployeeNotes("");
      setInsidePhoto(null);
      setInsidePhotoFile(null);
      setOutsidePhoto(null);
      setOutsidePhotoFile(null);
      setStickerStatus("none");
      setCompletionStep(1);
      setError(null);
      checkPhotoDocumentationTraining();
    }
  }, [isOpen, job?.id, employeeId]);

  const checkPhotoDocumentationTraining = async () => {
    try {
      const response = await fetch(`/api/employee/training?employeeId=${employeeId}&moduleId=photo-documentation`);
      if (response.ok) {
        const data = await response.json();
        setPhotoDocumentationCompleted(data.completed || false);
      }
    } catch (error) {
      console.error("Error checking photo documentation training:", error);
    }
  };

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

  const handleInsidePhotoSelect = (file: File, dataUrl: string) => {
    setInsidePhotoFile(file);
    setInsidePhoto(dataUrl);
    setError(null);
  };

  const handleOutsidePhotoSelect = (file: File, dataUrl: string) => {
    setOutsidePhotoFile(file);
    setOutsidePhoto(dataUrl);
    setError(null);
  };

  const handleCompleteJob = async () => {
    // Validate step 1: Photos (2 required if photo documentation training completed)
    if (photoDocumentationCompleted) {
      if (!insidePhoto || !outsidePhoto) {
        setError("Photo Documentation training requires exactly 2 photos: one inside the bin and one outside the bin");
        setCompletionStep(1);
        return;
      }
    } else {
      // If training not completed, at least one photo recommended
      if (!insidePhoto && !outsidePhoto) {
        setError("Please take at least one photo of the cleaned bins");
        setCompletionStep(1);
        return;
      }
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
      // Combine photos (inside first, then outside)
      const photos = [];
      if (insidePhoto) photos.push(insidePhoto);
      if (outsidePhoto) photos.push(outsidePhoto);
      const photoUrl = photos.length > 0 ? photos.join("|") : undefined; // Use | as separator

      await onCompleteJob(job.id, {
        employeeNotes: employeeNotes.trim() || undefined,
        binCount,
        completionPhotoUrl: photoUrl,
        insidePhotoUrl: insidePhoto || undefined,
        outsidePhotoUrl: outsidePhoto || undefined,
        stickerStatus,
        stickerPlaced: stickerStatus === "placed",
      });
      setEmployeeNotes("");
      setInsidePhoto(null);
      setInsidePhotoFile(null);
      setOutsidePhoto(null);
      setOutsidePhotoFile(null);
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
      // Validate photos based on training status
      if (photoDocumentationCompleted) {
        if (!insidePhoto || !outsidePhoto) {
          setError("Photo Documentation training requires exactly 2 photos: inside and outside");
          return;
        }
      } else {
        if (!insidePhoto && !outsidePhoto) {
          setError("Please take at least one photo before continuing");
          return;
        }
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
                  Step 1: Take Photos
                </h3>
                {photoDocumentationCompleted ? (
                  <>
                    <div
                      style={{
                        padding: "1rem",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                        fontSize: "0.875rem",
                        color: "#1e40af",
                      }}
                    >
                      <strong>Photo Documentation Training Completed:</strong> You must provide exactly 2 photos:
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                        <li>Inside photo: Camera angled downward showing clean base + walls</li>
                        <li>Outside photo: Full bin visible with sticker and clean exterior</li>
                      </ul>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                      <PhotoUpload
                        onPhotoSelect={handleInsidePhotoSelect}
                        currentPhoto={insidePhoto}
                        required={true}
                        label="Inside Photo (Required)"
                      />
                      <PhotoUpload
                        onPhotoSelect={handleOutsidePhotoSelect}
                        currentPhoto={outsidePhoto}
                        required={true}
                        label="Outside Photo (Required)"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "1rem",
                      }}
                    >
                      Take clear photos of the cleaned bins showing your work
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                      <PhotoUpload
                        onPhotoSelect={handleInsidePhotoSelect}
                        currentPhoto={insidePhoto}
                        required={false}
                        label="Inside Photo (Recommended)"
                      />
                      <PhotoUpload
                        onPhotoSelect={handleOutsidePhotoSelect}
                        currentPhoto={outsidePhoto}
                        required={false}
                        label="Outside Photo (Recommended)"
                      />
                    </div>
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.75rem",
                        background: "#fef3c7",
                        border: "1px solid #fde68a",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#92400e",
                      }}
                    >
                      💡 Complete Photo Documentation training to enable payment eligibility. 2 photos (inside + outside) will be required after training.
                    </div>
                  </>
                )}
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
                    {photoDocumentationCompleted ? (
                      <>
                        ✓ Inside Photo: {insidePhoto ? "Uploaded" : "Missing"}
                        <br />
                        ✓ Outside Photo: {outsidePhoto ? "Uploaded" : "Missing"}
                      </>
                    ) : (
                      <>✓ Photo: {(insidePhoto || outsidePhoto) ? "Uploaded" : "Missing"}</>
                    )}
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

