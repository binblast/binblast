// components/EmployeeDashboard/DailyMissionCard.tsx
"use client";

import { ClockInRecord } from "@/lib/employee-utils";
import { formatTime } from "@/lib/employee-utils";

interface DailyMissionCardProps {
  employeeName: string;
  clockInStatus: ClockInRecord | null;
  jobsTotal: number;
  jobsCompleted: number;
  estimatedPay: number;
  payRatePerJob: number;
  onClockIn: () => void;
  onClockOut: () => void;
  isClockInLoading?: boolean;
  canClockIn?: boolean;
  certificationStatus?: "completed" | "expired" | "in_progress" | "not_started";
  certificationExpiresAt?: string;
  certificationDaysRemaining?: number;
  routeName?: string;
  estimatedTime?: string;
}

export function DailyMissionCard({
  employeeName,
  clockInStatus,
  jobsTotal,
  jobsCompleted,
  estimatedPay,
  payRatePerJob,
  onClockIn,
  onClockOut,
  isClockInLoading = false,
  canClockIn = true,
  certificationStatus,
  certificationExpiresAt,
  certificationDaysRemaining,
  routeName,
  estimatedTime,
}: DailyMissionCardProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isClockedIn = clockInStatus?.isActive === true;
  const clockInTime = clockInStatus?.clockInTime
    ? formatTime(clockInStatus.clockInTime)
    : null;

  const jobsRemaining = jobsTotal - jobsCompleted;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        border: "2px solid #e5e7eb",
        marginBottom: "1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
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
              letterSpacing: "0.5px",
              marginBottom: "0.25rem",
            }}
            >
            Today&apos;s Mission
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            {employeeName}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            {currentDate}
          </div>
        </div>

        {/* Status Pills */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            alignItems: "flex-end",
          }}
        >
          {/* Shift Status */}
          <div
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: isClockedIn ? "#d1fae5" : "#f3f4f6",
              color: isClockedIn ? "#065f46" : "#6b7280",
            }}
          >
            {isClockedIn ? "On Shift" : "Off Shift"}
            {clockInTime && isClockedIn && ` • ${clockInTime}`}
          </div>

          {/* Certification Status */}
          {certificationStatus === "completed" && (
            <div
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: "600",
                background: "#d1fae5",
                color: "#065f46",
              }}
            >
              Certified
              {certificationDaysRemaining !== undefined &&
                certificationDaysRemaining < 30 && (
                  <span> • {certificationDaysRemaining}d left</span>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Mission Stats Grid */}
      {isClockedIn && jobsTotal > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
            padding: "1rem",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          {routeName && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                }}
              >
                Route
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                {routeName}
              </div>
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Stops Today
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              {jobsTotal}
            </div>
          </div>
          {estimatedTime && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                }}
              >
                Est. Time
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                {estimatedTime}
              </div>
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Est. Pay
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: "#16a34a",
              }}
            >
              ${estimatedPay.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Clock In/Out Button */}
      <button
        onClick={isClockedIn ? onClockOut : onClockIn}
        disabled={isClockInLoading || (!isClockedIn && !canClockIn)}
        title={!isClockedIn && !canClockIn ? "Complete training to unlock Clock In" : undefined}
        style={{
          width: "100%",
          minHeight: "56px",
          padding: "0.75rem 1rem",
          borderRadius: "12px",
          border: "none",
          fontSize: "1.125rem",
          fontWeight: "700",
          color: "#ffffff",
          background: isClockedIn
            ? "#dc2626"
            : !canClockIn
            ? "#9ca3af"
            : "#16a34a",
          cursor:
            isClockInLoading || (!isClockedIn && !canClockIn)
              ? "not-allowed"
              : "pointer",
          opacity: isClockInLoading || (!isClockedIn && !canClockIn) ? 0.6 : 1,
          transition: "all 0.2s",
          boxShadow: isClockedIn || canClockIn
            ? "0 2px 8px rgba(0, 0, 0, 0.1)"
            : "none",
        }}
        onMouseDown={(e) => {
          if (!isClockInLoading && (isClockedIn || canClockIn)) {
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
        {isClockInLoading
          ? "Processing..."
          : isClockedIn
          ? "CLOCK OUT - End Shift"
          : !canClockIn
          ? "CLOCK IN - Training Required"
          : `CLOCK IN - Start Mission`}
      </button>

      {!isClockedIn && (
        <div
          style={{
            marginTop: "0.75rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: !canClockIn ? "#dc2626" : "#6b7280",
            fontWeight: !canClockIn ? "600" : "400",
          }}
        >
          {!canClockIn
            ? "Complete training to unlock Clock In"
            : "Clock in to view today's route"}
        </div>
      )}
    </div>
  );
}

