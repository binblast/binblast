// components/EmployeeDashboard/QuizResults.tsx
// Quiz results component with score display and next steps

"use client";

interface QuizResultsProps {
  moduleId: string;
  moduleName: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  onNextLesson: () => void;
  onRetake: () => void;
  isLastModule?: boolean;
  onClaimCertificate?: () => void;
}

export function QuizResults({
  moduleId,
  moduleName,
  score,
  passed,
  totalQuestions,
  correctAnswers,
  onNextLesson,
  onRetake,
  isLastModule = false,
  onClaimCertificate,
}: QuizResultsProps) {
  return (
    <div>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          border: `2px solid ${passed ? "#16a34a" : "#dc2626"}`,
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
          }}
        >
          {passed ? "🎉" : "❌"}
        </div>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "0.5rem",
          }}
        >
          {passed ? "Congratulations!" : "Quiz Not Passed"}
        </h2>
        <p
          style={{
            fontSize: "1rem",
            color: "#6b7280",
            marginBottom: "1.5rem",
          }}
        >
          {passed
            ? `You passed the ${moduleName} quiz!`
            : `You scored ${score}%. You need at least 80% to pass.`}
        </p>

        {/* Score Display */}
        <div
          style={{
            display: "inline-block",
            padding: "1rem 2rem",
            background: passed ? "#d1fae5" : "#fee2e2",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: passed ? "#065f46" : "#991b1b",
            }}
          >
            {score}%
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: passed ? "#047857" : "#b91c1c",
            }}
          >
            {correctAnswers} out of {totalQuestions} correct
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          {passed ? (
            isLastModule && onClaimCertificate ? (
              <button
                onClick={onClaimCertificate}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                🎓 Claim Certificate
              </button>
            ) : (
              <button
                onClick={onNextLesson}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Continue Training
              </button>
            )
          ) : (
            <button
              onClick={onRetake}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#2563eb",
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
        </div>
      </div>

      {/* Summary */}
      <div
        style={{
          background: "#f9fafb",
          borderRadius: "8px",
          padding: "1rem",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
          Quiz Summary:
        </div>
        <div>Module: {moduleName}</div>
        <div>Score: {score}%</div>
        <div>Correct Answers: {correctAnswers} / {totalQuestions}</div>
        <div>Status: {passed ? "Passed ✓" : "Not Passed ✗"}</div>
      </div>
    </div>
  );
}
