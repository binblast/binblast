// components/EmployeeDashboard/ProgressTracker.tsx
"use client";

interface ProgressTrackerProps {
  completed: number;
  remaining: number;
  total: number;
}

export function ProgressTracker({
  completed,
  remaining,
  total,
}: ProgressTrackerProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#111827",
        }}
      >
        Daily Progress
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "24px",
          background: "#f3f4f6",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "0.75rem",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "#16a34a",
            transition: "width 0.3s ease",
            borderRadius: "12px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "0.75rem",
            fontWeight: "600",
            color: percentage > 50 ? "#ffffff" : "#111827",
          }}
        >
          {percentage}%
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <div>
          <span style={{ fontWeight: "600", color: "#16a34a" }}>
            {completed}
          </span>{" "}
          completed
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#dc2626" }}>
            {remaining}
          </span>{" "}
          remaining
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#111827" }}>{total}</span>{" "}
          total
        </div>
      </div>
    </div>
  );
}

