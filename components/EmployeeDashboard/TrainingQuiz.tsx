// components/EmployeeDashboard/TrainingQuiz.tsx
"use client";

import { useState, useEffect } from "react";
import { QuizQuestion } from "@/lib/training-modules";

interface TrainingQuizProps {
  moduleId: string;
  moduleName: string;
  employeeId: string;
  questions: QuizQuestion[];
  passingScore: number;
  onQuizComplete: (passed: boolean, score: number) => void;
  onRetake: () => void;
}

export function TrainingQuiz({
  moduleId,
  moduleName,
  employeeId,
  questions,
  passingScore,
  onQuizComplete,
  onRetake,
}: TrainingQuizProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Calculate score
      let correct = 0;
      const resultMap: Record<string, boolean> = {};

      questions.forEach((question) => {
        const isCorrect = answers[question.id] === question.correctAnswer;
        resultMap[question.id] = isCorrect;
        if (isCorrect) correct++;
      });

      const calculatedScore = Math.round((correct / questions.length) * 100);
      const passed = calculatedScore >= passingScore;

      setScore(calculatedScore);
      setResults(resultMap);
      setSubmitted(true);

      // Submit to API
      const response = await fetch(`/api/employee/training/${moduleId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({
            questionId,
            selectedAnswer,
            isCorrect: resultMap[questionId],
          })),
          score: calculatedScore,
          passed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save quiz results");
      }

      onQuizComplete(passed, calculatedScore);
    } catch (err: any) {
      setError(err.message || "Failed to submit quiz");
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setResults({});
    setError(null);
    onRetake();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {moduleName} - Quiz
        </h3>
        {submitted && score !== null && (
          <div
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: score >= passingScore ? "#d1fae5" : "#fee2e2",
              color: score >= passingScore ? "#065f46" : "#991b1b",
              fontWeight: "700",
              fontSize: "1rem",
            }}
          >
            Score: {score}%
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#dc2626",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {submitted && score !== null ? (
        // Results View
        <div>
          <div
            style={{
              padding: "1.5rem",
              background: score >= passingScore ? "#f0fdf4" : "#fef2f2",
              border: `2px solid ${score >= passingScore ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: "8px",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            {score >= passingScore ? (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "#065f46",
                    marginBottom: "0.5rem",
                  }}
                >
                  Congratulations! You Passed
                </div>
                <div style={{ fontSize: "0.875rem", color: "#047857" }}>
                  You scored {score}% (Passing score: {passingScore}%)
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}></div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "#991b1b",
                    marginBottom: "0.5rem",
                  }}
                >
                  Quiz Not Passed
                </div>
                <div style={{ fontSize: "0.875rem", color: "#7f1d1d" }}>
                  You scored {score}% (Need {passingScore}% to pass)
                </div>
              </>
            )}
          </div>

          {/* Question Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            {questions.map((question, index) => {
              const isCorrect = results[question.id];
              const selectedAnswer = answers[question.id];

              return (
                <div
                  key={question.id}
                  style={{
                    padding: "1rem",
                    background: "#ffffff",
                    border: `2px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        color: isCorrect ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {isCorrect ? "✓" : "✗"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Question {index + 1}: {question.question}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {question.options.map((option, optIndex) => {
                          const isSelected = optIndex === selectedAnswer;
                          const isCorrectAnswer = optIndex === question.correctAnswer;

                          return (
                            <div
                              key={optIndex}
                              style={{
                                padding: "0.75rem",
                                background:
                                  isCorrectAnswer
                                    ? "#d1fae5"
                                    : isSelected && !isCorrect
                                    ? "#fee2e2"
                                    : "#f9fafb",
                                border: `1px solid ${
                                  isCorrectAnswer
                                    ? "#bbf7d0"
                                    : isSelected && !isCorrect
                                    ? "#fecaca"
                                    : "#e5e7eb"
                                }`,
                                borderRadius: "6px",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              {isCorrectAnswer && <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Correct</span>}
                              {isSelected && !isCorrect && <span style={{ color: "#dc2626", fontWeight: "700" }}>✗ Your Answer</span>}
                              <span>{option}</span>
                            </div>
                          );
                        })}
                      </div>
                      {question.explanation && (
                        <div
                          style={{
                            marginTop: "0.75rem",
                            padding: "0.75rem",
                            background: "#eff6ff",
                            borderRadius: "6px",
                            fontSize: "0.8125rem",
                            color: "#1e40af",
                          }}
                        >
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            {score < passingScore ? (
              <button
                onClick={handleRetake}
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
                Retake Quiz (Unlimited Retries)
              </button>
            ) : (
              <div
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#d1fae5",
                  color: "#065f46",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                ✅ Training Complete! You can return to the training list.
              </div>
            )}
          </div>
        </div>
      ) : (
        // Quiz Questions View
        <div>
          <div
            style={{
              padding: "1rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
              color: "#1e40af",
            }}
          >
            Answer all {questions.length} questions. You need {passingScore}% to pass.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {questions.map((question, index) => (
              <div
                key={question.id}
                style={{
                  padding: "1.5rem",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "1rem",
                  }}
                >
                  Question {index + 1}: {question.question}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {question.options.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        background: answers[question.id] === optIndex ? "#eff6ff" : "#f9fafb",
                        border: `2px solid ${answers[question.id] === optIndex ? "#3b82f6" : "#e5e7eb"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={optIndex}
                        checked={answers[question.id] === optIndex}
                        onChange={() => handleAnswerSelect(question.id, optIndex)}
                        style={{
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ fontSize: "0.875rem", color: "#111827" }}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
              style={{
                padding: "0.75rem 2rem",
                background:
                  submitting || Object.keys(answers).length < questions.length
                    ? "#9ca3af"
                    : "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor:
                  submitting || Object.keys(answers).length < questions.length
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

