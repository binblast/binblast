// components/EmployeeDashboard/JobList.tsx
"use client";

import { useState } from "react";

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
  hasRequiredPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
}

interface JobListProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  isClockedIn: boolean;
  onStartNextJob?: (job: Job) => void;
}

export function JobList({ jobs, onJobClick, isClockedIn, onStartNextJob }: JobListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  
  if (!isClockedIn) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Clock in to see your jobs
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        <div style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
          No route assigned yet
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: "1.5" }}>
          Your manager is building today&apos;s route. You&apos;ll see stops here as soon as they&apos;re assigned.
        </div>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", text: "#065f46", border: "#bbf7d0" };
      case "in_progress":
        return { bg: "#dbeafe", text: "#1e40af", border: "#bae6fd" };
      default:
        return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
    }
  };

  const getPlanTypeLabel = (planType?: string) => {
    if (!planType) return "Residential";
    if (planType.toLowerCase().includes("commercial")) return "Commercial";
    return "Residential";
  };

  const openMap = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(address);
    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let mapUrl: string;
    if (isIOS) {
      mapUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
    } else if (isMobile) {
      mapUrl = `https://maps.google.com/?q=${encodedAddress}`;
    } else {
      mapUrl = `https://maps.google.com/?q=${encodedAddress}`;
    }
    
    window.open(mapUrl, "_blank");
  };

  const filteredJobs = filter === "all" 
    ? jobs 
    : jobs.filter((job) => job.jobStatus === filter);

  const pendingCount = jobs.filter((j) => j.jobStatus === "pending" || !j.jobStatus).length;
  const inProgressCount = jobs.filter((j) => j.jobStatus === "in_progress").length;
  const completedCount = jobs.filter((j) => j.jobStatus === "completed").length;
  
  // Find next pending job
  const nextJob = jobs.find((j) => j.jobStatus === "pending" || !j.jobStatus);
  const currentStopIndex = jobs.findIndex((j) => j.jobStatus === "pending" || !j.jobStatus);
  const currentStopNumber = currentStopIndex >= 0 ? currentStopIndex + 1 : completedCount + 1;

  return (
    <div>
      {/* Route Board Header */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Today&apos;s Route
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              Stop {currentStopNumber} of {jobs.length}
            </div>
          </div>
          {nextJob && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {onStartNextJob && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartNextJob(nextJob);
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: "#16a34a",
                    color: "#ffffff",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  Start Next Stop
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (nextJob) {
                    const fullAddress = `${nextJob.addressLine1}${
                      nextJob.addressLine2 ? `, ${nextJob.addressLine2}` : ""
                    }, ${nextJob.city}, ${nextJob.state} ${nextJob.zipCode}`;
                    openMap(fullAddress, e);
                  }
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#ffffff",
                  color: "#2563eb",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                Open Maps
              </button>
            </div>
          )}
        </div>
        {nextJob && (
          <div
            style={{
              padding: "0.75rem",
              background: "#f9fafb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "#111827" }}>
              Next Stop:
            </div>
            <div>
              {nextJob.addressLine1}
              {nextJob.addressLine2 ? `, ${nextJob.addressLine2}` : ""}, {nextJob.city}, {nextJob.state}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            background: filter === "all" ? "#16a34a" : "#f3f4f6",
            color: filter === "all" ? "#ffffff" : "#6b7280",
            transition: "all 0.2s",
          }}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            background: filter === "pending" ? "#f59e0b" : "#f3f4f6",
            color: filter === "pending" ? "#ffffff" : "#6b7280",
            transition: "all 0.2s",
          }}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            background: filter === "in_progress" ? "#2563eb" : "#f3f4f6",
            color: filter === "in_progress" ? "#ffffff" : "#6b7280",
            transition: "all 0.2s",
          }}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setFilter("completed")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            background: filter === "completed" ? "#16a34a" : "#f3f4f6",
            color: filter === "completed" ? "#ffffff" : "#6b7280",
            transition: "all 0.2s",
          }}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Load Board Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {filteredJobs.map((job) => {
        const statusColors = getStatusColor(job.jobStatus);
        const fullAddress = `${job.addressLine1}${
          job.addressLine2 ? `, ${job.addressLine2}` : ""
        }, ${job.city}, ${job.state} ${job.zipCode}`;

        return (
          <div
            key={job.id}
            onClick={() => onJobClick(job)}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.25rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              border: `2px solid ${statusColors.border}`,
              borderLeft: `4px solid ${statusColors.text}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
            }}
          >
            {/* Status Badge - Top Right */}
            <span
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: "700",
                textTransform: "uppercase",
                background: statusColors.bg,
                color: statusColors.text,
                letterSpacing: "0.5px",
              }}
            >
              {job.jobStatus || "pending"}
            </span>

            <div style={{ marginBottom: "0.75rem", paddingRight: "4rem" }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                  color: "#111827",
                  lineHeight: "1.3",
                }}
              >
                {job.customerName || job.userEmail || "Customer"}
              </div>
              <div
                onClick={(e) => openMap(fullAddress, e)}
                style={{
                  fontSize: "0.8125rem",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: "500",
                  lineHeight: "1.4",
                }}
                title="Tap to open in maps"
              >
                {fullAddress}
              </div>
            </div>

            {/* Quick Info Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                fontSize: "0.8125rem",
              }}
            >
              <div
                style={{
                  padding: "0.5rem",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: "600", color: "#6b7280", fontSize: "0.75rem" }}>
                  BINS
                </div>
                <div style={{ fontWeight: "700", color: "#111827", fontSize: "1rem" }}>
                  {job.binCount || "?"}
                </div>
              </div>
              <div
                style={{
                  padding: "0.5rem",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: "600", color: "#6b7280", fontSize: "0.75rem" }}>
                  TYPE
                </div>
                <div style={{ fontWeight: "700", color: "#111827", fontSize: "0.875rem" }}>
                  {getPlanTypeLabel(job.planType)}
                </div>
              </div>
            </div>

            {job.flags && job.flags.length > 0 && (
              <div
                style={{
                  padding: "0.5rem",
                  background: "#fef2f2",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#dc2626",
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: "0.5rem",
                }}
              >
                {job.flags.length} Flag{job.flags.length > 1 ? "s" : ""}
              </div>
            )}

            {job.notes && (
              <div
                style={{
                  padding: "0.5rem",
                  background: "#fef3c7",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#92400e",
                  lineHeight: "1.4",
                  maxHeight: "60px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={job.notes}
              >
                {job.notes.length > 50 ? job.notes.substring(0, 50) + "..." : job.notes}
              </div>
            )}

            {/* Photo Status Indicator - for in-progress jobs */}
            {job.jobStatus === "in_progress" && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem",
                  background: (job.hasRequiredPhotos || (job.insidePhotoUrl && job.outsidePhotoUrl)) 
                    ? "#d1fae5" 
                    : "#fef3c7",
                  border: `1px solid ${(job.hasRequiredPhotos || (job.insidePhotoUrl && job.outsidePhotoUrl)) 
                    ? "#86efac" 
                    : "#fde68a"}`,
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: (job.hasRequiredPhotos || (job.insidePhotoUrl && job.outsidePhotoUrl)) 
                    ? "#065f46" 
                    : "#92400e",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {(job.hasRequiredPhotos || (job.insidePhotoUrl && job.outsidePhotoUrl)) 
                  ? "✓ Photos Ready" 
                  : "⚠ Photos Required"}
              </div>
            )}

            {/* Action Hint */}
            <div
              style={{
                marginTop: "0.75rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #e5e7eb",
                fontSize: "0.75rem",
                color: "#9ca3af",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Tap to {job.jobStatus === "completed" ? "view details" : job.jobStatus === "in_progress" ? "complete" : "start"}
            </div>
          </div>
        );
      })}
      </div>

      {filteredJobs.length === 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
          }}
        >
          No {filter === "all" ? "" : filter.replace("_", " ")} jobs found
        </div>
      )}
    </div>
  );
}

