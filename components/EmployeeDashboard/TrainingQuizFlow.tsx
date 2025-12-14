// components/EmployeeDashboard/TrainingQuizFlow.tsx
// One-question-at-a-time quiz flow with immediate feedback

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuizResults } from "./QuizResults";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface TrainingQuizFlowProps {
  moduleId: string;
  moduleName: string;
  employeeId: string;
  questions: QuizQuestion[];
  passingScore: number;
}

export function TrainingQuizFlow({
  moduleId,
  moduleName,
  employeeId,
  questions,
  passingScore,
}: TrainingQuizFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isLastModule, setIsLastModule] = useState(false);
  const [claimingCertificate, setClaimingCertificate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkIfLastModule();
  }, [moduleId]);

  const checkIfLastModule = async () => {
    try {
      const response = await fetch("/api/training/modules?active=true");
      if (response.ok) {
        const data = await response.json();
        const modules = data.modules || [];
        const sortedModules = modules.sort((a: any, b: any) => a.order - b.order);
        const currentModule = sortedModules.find((m: any) => m.id === moduleId);
        if (currentModule) {
          const isLast = currentModule.order === sortedModules.length;
          setIsLastModule(isLast);
        }
      }
    } catch (err) {
      console.error("Error checking if last module:", err);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  useEffect(() => {
    // Load previous answer if exists
    if (answers[currentQuestionIndex] !== undefined) {
      setSelectedAnswer(answers[currentQuestionIndex]);
      setShowFeedback(true);
    } else {
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  }, [currentQuestionIndex, answers]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback || submitted) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correctIndex;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: selectedAnswer,
    }));
    setResults((prev) => ({
      ...prev,
      [currentQuestionIndex]: isCorrect,
    }));
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Calculate final score and submit
      handleFinalSubmit();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);

    try {
      // Calculate score
      const correctCount = Object.values(results).filter((r) => r).length;
      const calculatedScore = Math.round((correctCount / questions.length) * 100);
      const passed = calculatedScore >= passingScore;

      setScore(calculatedScore);
      setSubmitted(true);

      // Submit to API
      const response = await fetch(`/api/employee/training/${moduleId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          answers: Object.entries(answers).map(([index, selectedAnswer]) => ({
            questionId: `q-${index}`,
            selectedAnswer,
            isCorrect: results[Number(index)],
          })),
          score: calculatedScore,
          passed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save quiz results");
      }

      // Mark module as complete if passed
      if (passed) {
        await fetch(`/api/employee/training/modules/${moduleId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            score: calculatedScore,
            passed: true,
          }),
        });
      }

      // Auto-scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById("quiz-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/employee/dashboard");
  };

  if (submitted && score !== null) {
    const passed = score >= passingScore;
    return (
      <div id="quiz-results">
        <QuizResults
          moduleId={moduleId}
          moduleName={moduleName}
          score={score}
          passed={passed}
          totalQuestions={questions.length}
          correctAnswers={Object.values(results).filter((r) => r).length}
          isLastModule={isLastModule && passed}
          onNextLesson={() => router.push("/employee/dashboard")}
          onRetake={() => {
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowFeedback(false);
            setAnswers({});
            setResults({});
            setSubmitted(false);
            setScore(null);
          }}
          onClaimCertificate={isLastModule && passed ? handleClaimCertificate : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleBack}
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Training
        </button>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "0.5rem",
          }}
        >
          {moduleName} - Quiz
        </h1>
        <div
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginBottom: "1rem",
          }}
        >
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        {/* Progress Bar */}
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
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              height: "100%",
              background: "#2563eb",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          border: "1px solid #e5e7eb",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "1.5rem",
          }}
        >
          {currentQuestion.question}
        </h2>

        {/* Answer Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showCorrect = showFeedback && isCorrect;
            const showIncorrect = showFeedback && isSelected && !isCorrect;

            let bgColor = "#ffffff";
            let borderColor = "#e5e7eb";
            let textColor = "#111827";

            if (showFeedback) {
              if (showCorrect) {
                bgColor = "#d1fae5";
                borderColor = "#16a34a";
                textColor = "#065f46";
              } else if (showIncorrect) {
                bgColor = "#fee2e2";
                borderColor = "#dc2626";
                textColor = "#991b1b";
              }
            } else if (isSelected) {
              bgColor = "#eff6ff";
              borderColor = "#2563eb";
              textColor = "#1e40af";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback || submitted}
                style={{
                  padding: "1rem",
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  color: textColor,
                  fontWeight: isSelected ? "600" : "400",
                  cursor: showFeedback || submitted ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {showCorrect && "✓ "}
                {showIncorrect && "✗ "}
                {option}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showFeedback && currentQuestion.explanation && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#0369a1",
                marginBottom: "0.5rem",
              }}
            >
              Explanation:
            </div>
            <div style={{ fontSize: "0.875rem", color: "#075985" }}>
              {currentQuestion.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <button
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={isFirstQuestion || submitting}
          style={{
            padding: "0.75rem 1.5rem",
            background: isFirstQuestion ? "#f3f4f6" : "#ffffff",
            color: isFirstQuestion ? "#9ca3af" : "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: isFirstQuestion ? "not-allowed" : "pointer",
          }}
        >
          ← Previous
        </button>

        {!showFeedback ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || submitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: selectedAnswer === null ? "#f3f4f6" : "#2563eb",
              color: selectedAnswer === null ? "#9ca3af" : "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: selectedAnswer === null ? "not-allowed" : "pointer",
            }}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {isLastQuestion ? "Finish Quiz" : "Next Question →"}
          </button>
        )}
      </div>
    </div>
  );
}
