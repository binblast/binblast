// components/EmployeeDashboard/JobList.tsx
"use client";

import { useState } from "react";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import {
  formatCleanDateTime,
  parseFirestoreTimestamp,
} from "@/lib/employee-utils";

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
  binsCount?: number;
  scheduledTime?: string;
  scheduledDate?: string;
  trashDay?: string;
  planType?: string;
  notes?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  flags?: string[];
  hasRequiredPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
  completedAt?: unknown;
}

interface JobListProps {
  jobs: Job[];
  completedJobs?: Job[];
  upcomingJobs?: Job[];
  selectedJobId?: string | null;
  onJobClick: (job: Job) => void;
  onStartJob?: (job: Job) => Promise<void>;
  isClockedIn: boolean;
  onStartNextJob?: (job: Job) => void;
  payRatePerJob?: number;
}

function isPayEligible(job: Job): boolean {
  if (job.hasRequiredPhotos === true) return true;
  return Boolean(job.insidePhotoUrl && job.outsidePhotoUrl);
}

export function JobList({
  jobs,
  completedJobs = [],
  upcomingJobs = [],
  selectedJobId = null,
  onJobClick,
  onStartJob,
  isClockedIn,
  onStartNextJob,
  payRatePerJob = 0,
}: JobListProps) {
  const [routeTab, setRouteTab] = useState<"active" | "closed">("active");

  const formatJobDate = (date?: string) => {
    if (!date) return "Date TBD";
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const renderPreviewJob = (job: Job, isToday: boolean) => {
    const fullAddress = `${job.addressLine1}${
      job.addressLine2 ? `, ${job.addressLine2}` : ""
    }, ${job.city}, ${job.state} ${job.zipCode}`;

    return (
      <div
        key={job.id}
        style={{
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          background: isToday ? "#f0fdf4" : "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
              {job.customerName || job.userEmail || "Customer"}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.35rem" }}>
              {fullAddress}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
              {formatJobDate(job.scheduledDate)} • {job.scheduledTime || "Time TBD"} • {job.binCount ?? job.binsCount ?? 1} bins
            </div>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: "600",
              background: isToday ? "#dcfce7" : "#eff6ff",
              color: isToday ? "#166534" : "#1d4ed8",
            }}
          >
            {isToday ? "Today" : "Upcoming"}
          </span>
        </div>
      </div>
    );
  };

  if (!isClockedIn) {
    const previewJobs = [...jobs, ...upcomingJobs];

    if (previewJobs.length === 0) {
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
            Your manager will assign stops here. Clock in when you&apos;re ready to start your route.
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: "700", color: "#111827", marginBottom: "0.35rem" }}>
            Your Assigned Route
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Preview your stops below, then clock in to start working them.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {jobs.map((job) => renderPreviewJob(job, true))}
          {upcomingJobs.map((job) => renderPreviewJob(job, false))}
        </div>
      </div>
    );
  }

  if (isClockedIn && jobs.length === 0 && completedJobs.length === 0) {
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

  const completedCount = completedJobs.length;
  const totalStops = jobs.length + completedCount;

  const nextJob = jobs.find((j) => j.jobStatus === "pending" || !j.jobStatus);
  const currentStopIndex = jobs.findIndex((j) => j.jobStatus === "pending" || !j.jobStatus);
  const currentStopNumber = currentStopIndex >= 0 ? currentStopIndex + 1 : completedCount + 1;

  const sortedClosedJobs = [...completedJobs].sort((a, b) => {
    const aTime = parseFirestoreTimestamp(a.completedAt)?.getTime() ?? 0;
    const bTime = parseFirestoreTimestamp(b.completedAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  const tabButtonStyle = (active: boolean, color: string) => ({
    flex: 1,
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.875rem",
    fontWeight: "700",
    cursor: "pointer",
    background: active ? color : "#f3f4f6",
    color: active ? "#ffffff" : "#6b7280",
    transition: "all 0.2s",
    minHeight: "44px",
  });

  return (
    <div>
      <CleaningReadinessBanner variant="staff" />

      {/* Active / Closed Tabs */}
      <div
        className="route-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => setRouteTab("active")}
          style={tabButtonStyle(routeTab === "active", "#2563eb")}
        >
          Active ({jobs.length})
        </button>
        <button
          onClick={() => setRouteTab("closed")}
          style={tabButtonStyle(routeTab === "closed", "#16a34a")}
        >
          Closed ({completedCount})
        </button>
      </div>

      {routeTab === "active" && (
      <>
      {/* Route Board Header */}
      <div
        className="route-board-header"
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "clamp(1rem, 4vw, 1.25rem)",
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
            width: "100%",
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
              Stop {currentStopNumber} of {totalStops}
            </div>
          </div>
          {nextJob && (
            <div
              className="route-actions"
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              {onStartNextJob && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartNextJob(nextJob);
                  }}
                  style={{
                    padding: "clamp(0.5rem, 2vw, 0.625rem) clamp(1rem, 4vw, 1.25rem)",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "clamp(0.8125rem, 3vw, 0.875rem)",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: "#16a34a",
                    color: "#ffffff",
                    transition: "all 0.2s",
                    minHeight: "44px",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
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
                  padding: "clamp(0.5rem, 2vw, 0.625rem) clamp(1rem, 4vw, 1.25rem)",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "clamp(0.8125rem, 3vw, 0.875rem)",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#ffffff",
                  color: "#2563eb",
                  transition: "all 0.2s",
                  minHeight: "44px",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
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
      </>
      )}

      {routeTab === "active" && jobs.length === 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            marginBottom: "1rem",
          }}
        >
          No active jobs on your route. Check the Closed tab for completed stops.
        </div>
      )}

      {routeTab === "active" && (
      <>
      {/* Load Board Grid */}
      <div
        className="job-list-grid"
        style={{
          display: jobs.length > 0 ? "grid" : "none",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "clamp(0.75rem, 3vw, 1rem)",
        }}
      >
        {jobs.map((job) => {
        const statusColors = getStatusColor(job.jobStatus);
        const fullAddress = `${job.addressLine1}${
          job.addressLine2 ? `, ${job.addressLine2}` : ""
        }, ${job.city}, ${job.state} ${job.zipCode}`;
        const binsToClean = job.binCount || job.binsCount || 1;
        const isNextStop = nextJob?.id === job.id;
        const isPending = job.jobStatus === "pending" || !job.jobStatus;
        const isSelected = selectedJobId === job.id;

        return (
          <div
            key={job.id}
            className="job-card"
            onClick={() => onJobClick(job)}
            style={{
              background: isNextStop ? "#f0fdf4" : isSelected ? "#f8fafc" : "#ffffff",
              borderRadius: "12px",
              padding: "clamp(1rem, 4vw, 1.25rem)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              border: `2px solid ${statusColors.border}`,
              borderLeft: `4px solid ${statusColors.text}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
              touchAction: "manipulation",
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
                background: isNextStop ? "#16a34a" : statusColors.bg,
                color: isNextStop ? "#ffffff" : statusColors.text,
                letterSpacing: "0.5px",
              }}
            >
              {isNextStop ? "Next Stop" : job.jobStatus || "pending"}
            </span>

            <div className="job-header" style={{ marginBottom: "0.75rem", paddingRight: "4rem" }}>
              <div
                style={{
                  fontSize: "clamp(0.9375rem, 4vw, 1rem)",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                  color: "#111827",
                  lineHeight: "1.3",
                }}
              >
                {job.customerName || job.userEmail || "Customer"}
              </div>
              <div
                className="job-address"
                onClick={(e) => openMap(fullAddress, e)}
                style={{
                  fontSize: "clamp(0.75rem, 3vw, 0.8125rem)",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: "500",
                  lineHeight: "1.4",
                  touchAction: "manipulation",
                }}
                title="Tap to open in maps"
              >
                {fullAddress}
              </div>
            </div>

            {/* Quick Info Grid */}
            <div
              className="quick-info-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "clamp(0.5rem, 2vw, 0.75rem)",
                marginBottom: "0.75rem",
                fontSize: "clamp(0.75rem, 3vw, 0.8125rem)",
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
                  {binsToClean}
                </div>
              </div>
              <div
                style={{
                  padding: "0.5rem",
                  background: "#fff7ed",
                  borderRadius: "6px",
                  textAlign: "center",
                  border: "1px solid #fed7aa",
                }}
              >
                <div style={{ fontWeight: "600", color: "#9a3412", fontSize: "0.75rem" }}>
                  WINDOW
                </div>
                <div style={{ fontWeight: "700", color: "#9a3412", fontSize: "0.75rem" }}>
                  {job.scheduledTime || "TBD"}
                </div>
              </div>
              <div
                style={{
                  padding: "0.5rem",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  textAlign: "center",
                  gridColumn: "1 / -1",
                }}
              >
                <div style={{ fontWeight: "600", color: "#c2410c", fontSize: "0.75rem" }}>
                  CURB PLACEMENT REQUIRED
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
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {isPending && onStartJob && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onStartJob(job);
                  }}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Start Job
                </button>
              )}

              {job.jobStatus === "in_progress" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJobClick(job);
                  }}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Upload Photos & Complete
                </button>
              )}

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                {isPending
                  ? "Open maps above, then start when you arrive"
                  : job.jobStatus === "completed"
                    ? "Tap to view completed job"
                    : "Tap address for directions"}
              </div>
            </div>
          </div>
        );
      })}
      </div>
      </>
      )}

      {routeTab === "closed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedClosedJobs.length === 0 ? (
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
              No completed jobs yet. Finished stops will appear here.
            </div>
          ) : (
            sortedClosedJobs.map((job, index) => {
              const bins = job.binCount ?? job.binsCount ?? 1;
              const eligible = isPayEligible(job);
              const fullAddress = `${job.addressLine1}${
                job.addressLine2 ? `, ${job.addressLine2}` : ""
              }, ${job.city}, ${job.state}`;
              const cleanDateTime = formatCleanDateTime(job.scheduledDate, job.completedAt);

              return (
                <div
                  key={job.id}
                  onClick={() => onJobClick(job)}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.875rem",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f0fdf4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: "#16a34a",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    {sortedClosedJobs.length - index}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          color: "#111827",
                          fontSize: "0.9375rem",
                        }}
                      >
                        {job.customerName || job.userEmail || "Customer"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: "600",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cleanDateTime}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "#6b7280",
                        marginBottom: "0.5rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={fullAddress}
                    >
                      {fullAddress}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: "#374151",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        {bins} bin{bins !== 1 ? "s" : ""}
                      </span>

                      {eligible && payRatePerJob > 0 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            color: "#16a34a",
                            background: "#dcfce7",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          +${payRatePerJob.toFixed(2)}
                        </span>
                      )}

                      {(job.insidePhotoUrl || job.outsidePhotoUrl) && (
                        <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                          {job.outsidePhotoUrl && (
                            <img
                              src={job.outsidePhotoUrl}
                              alt="Outside bin"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "4px",
                                objectFit: "cover",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          )}
                          {job.insidePhotoUrl && (
                            <img
                              src={job.insidePhotoUrl}
                              alt="Inside bin"
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "4px",
                                objectFit: "cover",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

