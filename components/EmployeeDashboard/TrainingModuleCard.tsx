// components/EmployeeDashboard/TrainingModuleCard.tsx
// Module card component for training list

"use client";

interface TrainingModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string;
    categoryTag: "Guide" | "Safety" | "Best Practices";
    durationMinutes: number;
    order: number;
    pdfUrl?: string;
    required: boolean;
    requiredForPayment: boolean;
  };
  progress?: {
    startedAt?: string;
    completedAt?: string;
    score?: number;
    attempts: number;
    pdfViewed: boolean;
    lastPagePosition?: number;
  };
  status: "locked" | "in_progress" | "passed" | "failed" | "not_started" | "expired";
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
}

export function TrainingModuleCard({
  module,
  progress,
  status,
  onStart,
  onContinue,
  onReview,
}: TrainingModuleCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Safety":
        return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
      case "Guide":
        return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
      case "Best Practices":
        return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
      default:
        return { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "locked":
        return { icon: "🔒", text: "Locked", color: "#6b7280", bg: "#f3f4f6" };
      case "in_progress":
        return { icon: "🔄", text: "In Progress", color: "#92400e", bg: "#fef3c7" };
      case "passed":
        return { icon: "✅", text: "Passed", color: "#065f46", bg: "#d1fae5" };
      case "failed":
        return { icon: "❌", text: "Failed", color: "#991b1b", bg: "#fee2e2" };
      case "expired":
        return { icon: "⚠️", text: "Expired", color: "#991b1b", bg: "#fee2e2" };
      case "not_started":
        return { icon: "❌", text: "Not Started", color: "#6b7280", bg: "#f3f4f6" };
      default:
        return { icon: "❌", text: "Not Started", color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const categoryColors = getCategoryColor(module.categoryTag);
  const statusBadge = getStatusBadge();
  const isLocked = status === "locked";
  const isCompleted = status === "passed";
  const isExpired = status === "expired";
  const isFailed = status === "failed";
  const isNotStarted = status === "not_started";
  const isInProgress = status === "in_progress";

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        border: `2px solid ${categoryColors.border}`,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        opacity: isLocked ? 0.6 : 1,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              {module.title}
            </h3>
            {module.requiredForPayment && (
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  background: "#fef3c7",
                  color: "#92400e",
                }}
              >
                REQUIRED FOR PAYMENT
              </span>
            )}
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: "600",
                background: statusBadge.bg,
                color: statusBadge.color,
              }}
            >
              {statusBadge.icon} {statusBadge.text}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            {module.description}
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              fontSize: "0.75rem",
              color: "#9ca3af",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                background: categoryColors.bg,
                color: categoryColors.text,
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {module.categoryTag}
            </span>
            <span>Duration: {module.durationMinutes} min</span>
            {progress?.score !== undefined && (
              <span style={{ fontWeight: "600", color: "#111827" }}>
                Quiz Score: {progress.score}%
              </span>
            )}
            {progress && progress.attempts > 0 && (
              <span>Attempts: {progress.attempts}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && progress.completedAt && (
        <div style={{ marginBottom: "0.75rem" }}>
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
                width: "100%",
                height: "100%",
                background: isCompleted ? "#16a34a" : "#f59e0b",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Locked State */}
        {isLocked && (
          <button
            disabled
            title="Complete previous modules to unlock"
            style={{
              flex: 1,
              minWidth: "150px",
              padding: "0.75rem 1rem",
              background: "#f3f4f6",
              color: "#9ca3af",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "not-allowed",
            }}
          >
            🔒 Locked
          </button>
        )}

        {/* Not Started State */}
        {!isLocked && isNotStarted && (
          <button
            onClick={onStart}
            style={{
              flex: 1,
              minWidth: "150px",
              padding: "0.75rem 1rem",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Start Lesson
          </button>
        )}

        {/* In Progress State */}
        {!isLocked && isInProgress && !progress?.completedAt && (
          <>
            {progress?.pdfViewed && !progress?.materialReviewed && (
              <button
                onClick={onStart}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  padding: "0.75rem 1rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Resume Lesson
              </button>
            )}
            {progress?.materialReviewed && (
              <button
                onClick={onContinue}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  padding: "0.75rem 1rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Take Quiz
              </button>
            )}
            <button
              onClick={onReview}
              style={{
                padding: "0.75rem 1rem",
                background: "#ffffff",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Review PDF
            </button>
          </>
        )}

        {/* Failed State */}
        {isFailed && (
          <button
            onClick={onContinue}
            style={{
              flex: 1,
              minWidth: "150px",
              padding: "0.75rem 1rem",
              background: "#f97316",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Retry Quiz
          </button>
        )}

        {/* Passed State */}
        {isCompleted && (
          <button
            onClick={onReview}
            style={{
              flex: 1,
              minWidth: "150px",
              padding: "0.75rem 1rem",
              background: "#f3f4f6",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Review Lesson
          </button>
        )}

        {/* Expired State */}
        {isExpired && (
          <button
            onClick={onStart}
            style={{
              flex: 1,
              minWidth: "150px",
              padding: "0.75rem 1rem",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Re-certify
          </button>
        )}
      </div>
    </div>
  );
}
