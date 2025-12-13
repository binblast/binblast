// components/EmployeeDashboard/TodayStatusBar.tsx
"use client";

import { ClockInRecord } from "@/lib/employee-utils";
import { formatTime } from "@/lib/employee-utils";

interface TodayStatusBarProps {
  employeeName: string;
  clockInStatus: ClockInRecord | null;
  jobsRemaining: number;
  onClockIn: () => void;
  onClockOut: () => void;
  isClockInLoading?: boolean;
}

export function TodayStatusBar({
  employeeName,
  clockInStatus,
  jobsRemaining,
  onClockIn,
  onClockOut,
  isClockInLoading = false,
}: TodayStatusBarProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const isClockedIn = clockInStatus?.isActive === true;
  const clockInTime = clockInStatus?.clockInTime
    ? formatTime(clockInStatus.clockInTime)
    : null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#ffffff",
        borderBottom: "2px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        padding: "1rem",
      }}
    >
      {/* Status Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ fontWeight: "600", fontSize: "1rem", color: "#111827" }}>
          {employeeName}
        </div>
        <div
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: "600",
            textTransform: "uppercase",
            background: isClockedIn
              ? "#d1fae5"
              : clockInStatus && !clockInStatus.isActive
              ? "#f3f4f6"
              : "#fee2e2",
            color: isClockedIn
              ? "#065f46"
              : clockInStatus && !clockInStatus.isActive
              ? "#6b7280"
              : "#991b1b",
          }}
        >
          {isClockedIn
            ? `CLOCKED IN${clockInTime ? ` - ${clockInTime}` : ""}`
            : clockInStatus && !clockInStatus.isActive
            ? "CLOCKED OUT"
            : "NOT CLOCKED IN"}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{currentDate}</div>
      </div>

      {/* Jobs Remaining */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Jobs Remaining:
        </div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {jobsRemaining}
        </div>
      </div>

      {/* Clock In/Out Button */}
      <button
        onClick={isClockedIn ? onClockOut : onClockIn}
        disabled={isClockInLoading}
        style={{
          width: "100%",
          minHeight: "60px",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          border: "none",
          fontSize: "1.25rem",
          fontWeight: "700",
          color: "#ffffff",
          background: isClockedIn ? "#dc2626" : "#16a34a",
          cursor: isClockInLoading ? "not-allowed" : "pointer",
          opacity: isClockInLoading ? 0.6 : 1,
          transition: "opacity 0.2s, transform 0.1s",
        }}
        onMouseDown={(e) => {
          if (!isClockInLoading) {
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
          : `CLOCK IN - ${new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`}
      </button>

      {!isClockedIn && (
        <div
          style={{
            marginTop: "0.5rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          Clock in to view today&apos;s route
        </div>
      )}
    </div>
  );
}

