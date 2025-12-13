// components/EmployeeDashboard/IssueFlags.tsx
"use client";

interface IssueFlagsProps {
  jobId: string;
  currentFlags: string[];
  onFlag: (flag: string) => void;
}

const FLAG_OPTIONS = [
  { value: "missed_bin", label: "Missed Bin" },
  { value: "excessive_dirt", label: "Excessive Dirt" },
  { value: "access_issue", label: "Access Issue" },
  { value: "safety_issue", label: "Safety Issue" },
];

export function IssueFlags({ jobId, currentFlags, onFlag }: IssueFlagsProps) {
  return (
    <div
      style={{
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          marginBottom: "0.75rem",
          color: "#111827",
        }}
      >
        Flag Issues
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        {FLAG_OPTIONS.map((flag) => {
          const isFlagged = currentFlags.includes(flag.value);
          return (
            <button
              key={flag.value}
              onClick={() => onFlag(flag.value)}
              style={{
                minHeight: "44px",
                minWidth: "120px",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: `2px solid ${isFlagged ? "#dc2626" : "#e5e7eb"}`,
                background: isFlagged ? "#fee2e2" : "#ffffff",
                color: isFlagged ? "#991b1b" : "#111827",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isFlagged) {
                  e.currentTarget.style.borderColor = "#dc2626";
                  e.currentTarget.style.background = "#fef2f2";
                }
              }}
              onMouseLeave={(e) => {
                if (!isFlagged) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#ffffff";
                }
              }}
            >
              {flag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

