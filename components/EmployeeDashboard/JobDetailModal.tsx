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
  const [insidePhotoId, setInsidePhotoId] = useState<string | null>(null);
  const [outsidePhoto, setOutsidePhoto] = useState<string | null>(null);
  const [outsidePhotoFile, setOutsidePhotoFile] = useState<File | null>(null);
  const [outsidePhotoId, setOutsidePhotoId] = useState<string | null>(null);
  const [dumpsterPadPhoto, setDumpsterPadPhoto] = useState<string | null>(null);
  const [dumpsterPadPhotoId, setDumpsterPadPhotoId] = useState<string | null>(null);
  const [stickerPlacementPhoto, setStickerPlacementPhoto] = useState<string | null>(null);
  const [stickerPlacementPhotoId, setStickerPlacementPhotoId] = useState<string | null>(null);
  const [stickerStatus, setStickerStatus] = useState<StickerStatus>("none");
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
      setError(null);
      checkPhotoDocumentationTraining();
      loadExistingPhotos();
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

  const handleInsidePhotoUploaded = (photoId: string, storageUrl: string) => {
    setInsidePhotoId(photoId);
    setInsidePhoto(storageUrl);
  };

  const handleOutsidePhotoSelect = (file: File, dataUrl: string) => {
    setOutsidePhotoFile(file);
    setOutsidePhoto(dataUrl);
    setError(null);
  };

  const handleOutsidePhotoUploaded = (photoId: string, storageUrl: string) => {
    setOutsidePhotoId(photoId);
    setOutsidePhoto(storageUrl);
  };

  const handleDumpsterPadPhotoSelect = (file: File, dataUrl: string) => {
    setDumpsterPadPhoto(dataUrl);
  };

  const handleDumpsterPadPhotoUploaded = (photoId: string, storageUrl: string) => {
    setDumpsterPadPhotoId(photoId);
    setDumpsterPadPhoto(storageUrl);
  };

  const handleStickerPlacementPhotoSelect = (file: File, dataUrl: string) => {
    setStickerPlacementPhoto(dataUrl);
  };

  const handleStickerPlacementPhotoUploaded = (photoId: string, storageUrl: string) => {
    setStickerPlacementPhotoId(photoId);
    setStickerPlacementPhoto(storageUrl);
  };

  const handleCompleteJob = async () => {
    // MANDATORY VALIDATION: Both inside and outside photos are REQUIRED
    if (!insidePhoto || !outsidePhoto) {
      setError("Both inside and outside photos are required to complete this job. Please upload both photos before marking the job as complete.");
      return;
    }

    // Verify photos are uploaded (have photo IDs)
    if (!insidePhotoId || !outsidePhotoId) {
      setError("Photos must be uploaded before completing the job. Please wait for uploads to complete.");
      return;
    }

    // Validate sticker status
    if (stickerStatus === "none") {
      setError("Please confirm sticker status");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Use storage URLs from uploaded photos
      await onCompleteJob(job.id, {
        employeeNotes: employeeNotes.trim() || undefined,
        binCount,
        completionPhotoUrl: insidePhoto + "|" + outsidePhoto, // For backward compatibility
        insidePhotoUrl: insidePhoto,
        outsidePhotoUrl: outsidePhoto,
        stickerStatus,
        stickerPlaced: stickerStatus === "placed",
      });
      setEmployeeNotes("");
      setInsidePhoto(null);
      setInsidePhotoFile(null);
      setInsidePhotoId(null);
      setOutsidePhoto(null);
      setOutsidePhotoFile(null);
      setOutsidePhotoId(null);
      setDumpsterPadPhoto(null);
      setDumpsterPadPhotoId(null);
      setStickerPlacementPhoto(null);
      setStickerPlacementPhotoId(null);
      setStickerStatus("none");
      
      // Clear photo cache
      if (job.id) {
        localStorage.removeItem(`job-photo-${job.id}-inside`);
        localStorage.removeItem(`job-photo-${job.id}-outside`);
        localStorage.removeItem(`job-photo-${job.id}-dumpster_pad`);
        localStorage.removeItem(`job-photo-${job.id}-sticker_placement`);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to complete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if job can be completed (both required photos uploaded)
  const canCompleteJob = insidePhoto && outsidePhoto && insidePhotoId && outsidePhotoId && stickerStatus !== "none";

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

        {/* Linear Completion Form (if not completed) */}
        {!isCompleted && isInProgress && (
          <>
            {/* Job Checklist - Always Visible */}
            <div
              style={{
                padding: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "0.75rem",
                }}
              >
                Job Checklist:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {insidePhoto && outsidePhoto ? "✓" : "○"} Inside cleaned
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {insidePhoto && outsidePhoto ? "✓" : "○"} Outside cleaned
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {stickerStatus !== "none" ? "✓" : "○"} Sticker applied
                </div>
              </div>
            </div>

            {/* Photo Upload Section - REQUIRED */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Required Photos
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                }}
              >
                Both photos are required to complete this job
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <PhotoUpload
                  onPhotoSelect={handleInsidePhotoSelect}
                  onPhotoUploaded={handleInsidePhotoUploaded}
                  currentPhoto={insidePhoto}
                  required={true}
                  label="Inside Bin Photo"
                  photoType="inside"
                  jobId={job.id}
                  employeeId={employeeId}
                  showExamples={true}
                  uploadImmediately={true}
                />
                <PhotoUpload
                  onPhotoSelect={handleOutsidePhotoSelect}
                  onPhotoUploaded={handleOutsidePhotoUploaded}
                  currentPhoto={outsidePhoto}
                  required={true}
                  label="Outside Bin Photo"
                  photoType="outside"
                  jobId={job.id}
                  employeeId={employeeId}
                  showExamples={true}
                  uploadImmediately={true}
                />
              </div>

              {/* Optional Photos */}
              <div style={{ marginTop: "1.5rem" }}>
                <h4
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#111827",
                  }}
                >
                  Optional Photos
                </h4>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  Only if applicable to this job
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <PhotoUpload
                    onPhotoSelect={handleDumpsterPadPhotoSelect}
                    onPhotoUploaded={handleDumpsterPadPhotoUploaded}
                    currentPhoto={dumpsterPadPhoto}
                    required={false}
                    label="Dumpster Pad Photo (Optional)"
                    photoType="dumpster_pad"
                    jobId={job.id}
                    employeeId={employeeId}
                    showExamples={true}
                    uploadImmediately={true}
                  />
                  <PhotoUpload
                    onPhotoSelect={handleStickerPlacementPhotoSelect}
                    onPhotoUploaded={handleStickerPlacementPhotoUploaded}
                    currentPhoto={stickerPlacementPhoto}
                    required={false}
                    label="Sticker Placement Photo (Optional)"
                    photoType="sticker_placement"
                    jobId={job.id}
                    employeeId={employeeId}
                    showExamples={true}
                    uploadImmediately={true}
                  />
                </div>
              </div>
            </div>

            {/* Sticker Status */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Sticker Status
              </h3>
              <StickerConfirmation
                onStatusChange={setStickerStatus}
                currentStatus={stickerStatus}
              />
            </div>

            {/* Additional Details */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Additional Details
              </h3>

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
                  rows={3}
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
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
            <button
              onClick={handleCompleteJob}
              disabled={!canCompleteJob || isSubmitting}
              style={{
                flex: 1,
                minHeight: "48px",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                fontSize: "1rem",
                fontWeight: "700",
                color: "#ffffff",
                background: canCompleteJob ? "#16a34a" : "#9ca3af",
                cursor: canCompleteJob && !isSubmitting ? "pointer" : "not-allowed",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.2s, transform 0.1s",
              }}
            >
              {isSubmitting ? "Completing..." : canCompleteJob ? "✓ Mark Job Complete" : "Upload Required Photos"}
            </button>
          )}

          {/* Show requirements if not met */}
          {canComplete && !isCompleted && isInProgress && !canCompleteJob && (
            <div
              style={{
                padding: "0.75rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#dc2626",
                marginTop: "0.5rem",
              }}
            >
              {!insidePhoto || !insidePhotoId ? "• Inside photo required\n" : ""}
              {!outsidePhoto || !outsidePhotoId ? "• Outside photo required\n" : ""}
              {stickerStatus === "none" ? "• Sticker status required" : ""}
            </div>
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

