// components/EmployeeDashboard/PayPreview.tsx
"use client";

interface PayPreviewProps {
  completedJobs: number;
  payRatePerJob: number;
  estimatedPay: number;
  isClockedIn: boolean;
}

export function PayPreview({
  completedJobs,
  payRatePerJob,
  estimatedPay,
  isClockedIn,
}: PayPreviewProps) {
  if (!isClockedIn) {
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
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Pay Preview
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Clock in to see pay estimate
        </div>
      </div>
    );
  }

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
        Pay Preview
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Jobs completed today:</span>
          <span style={{ fontWeight: "600", color: "#111827" }}>
            {completedJobs}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Pay rate:</span>
          <span style={{ fontWeight: "600", color: "#111827" }}>
            ${payRatePerJob.toFixed(2)} per clean
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: "0.75rem",
            borderTop: "1px solid #e5e7eb",
            fontSize: "1rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          <span>Estimated pay today:</span>
          <span style={{ color: "#16a34a", fontSize: "1.25rem" }}>
            ${estimatedPay.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

