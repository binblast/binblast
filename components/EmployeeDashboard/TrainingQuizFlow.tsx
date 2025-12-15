// components/EmployeeDashboard/TrainingQuizFlow.tsx
// One-question-at-a-time quiz flow with immediate feedback

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QuizResults } from "./QuizResults";
import { getNextModule } from "@/lib/training-utils";

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
  const [nextModuleInfo, setNextModuleInfo] = useState<{ nextModuleId: string | null; currentModuleOrder: number; totalModules: number; isLastModule: boolean } | null>(null);
  const [autoNavigateCountdown, setAutoNavigateCountdown] = useState<number | null>(null);
  const [autoNavigateCancelled, setAutoNavigateCancelled] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkIfLastModule();
    loadNextModuleInfo();
  }, [moduleId]);

  const loadNextModuleInfo = async () => {
    try {
      const info = await getNextModule(moduleId);
      setNextModuleInfo(info);
      setIsLastModule(info.isLastModule);
    } catch (err) {
      console.error("Error loading next module info:", err);
    }
  };

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
      let response;
      try {
        response = await fetch(`/api/employee/training/${moduleId}/quiz`, {
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
      } catch (fetchError: any) {
        console.error("[Quiz Flow] Network error during fetch:", fetchError);
        throw new Error(`Network error: ${fetchError.message || "Failed to connect to server"}`);
      }

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error("[Quiz Flow] API error response:", errorData);
        } catch (parseError) {
          console.error("[Quiz Flow] Failed to parse error response:", parseError);
          const text = await response.text().catch(() => "");
          console.error("[Quiz Flow] Raw error response:", text);
        }
        throw new Error(errorMessage);
      }

      // Verify response is valid JSON
      const result = await response.json().catch((parseError) => {
        console.error("[Quiz Flow] Failed to parse success response:", parseError);
        throw new Error("Invalid response from server");
      });

      if (!result.success) {
        throw new Error(result.error || "Quiz submission failed");
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

      // Refresh training list if passed to show updated status
      if (passed) {
        // Trigger a custom event that TrainingList can listen to
        window.dispatchEvent(new CustomEvent('trainingProgressUpdated'));
        
        // Reload next module info in case order changed
        const nextInfo = await getNextModule(moduleId);
        setNextModuleInfo(nextInfo);
        setIsLastModule(nextInfo.isLastModule);
        
        // Start auto-navigation countdown if not last module and next module exists
        if (nextInfo.nextModuleId && !nextInfo.isLastModule) {
          setAutoNavigateCountdown(5);
          setAutoNavigateCancelled(false);
        }
      }
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      // Show error to user
      alert(err.message || "Failed to save quiz results. Please try again.");
      // Reset submitted state so user can retry
      setSubmitted(false);
      setScore(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle auto-navigation countdown
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Start countdown if conditions are met
    if (autoNavigateCountdown !== null && autoNavigateCountdown > 0 && !autoNavigateCancelled) {
      countdownIntervalRef.current = setInterval(() => {
        setAutoNavigateCountdown((prev) => {
          if (prev === null || prev === undefined) {
            return null;
          }
          if (prev <= 1) {
            return 0; // Set to 0 to trigger navigation
          }
          return prev - 1;
        });
      }, 1000);
    } else if (autoNavigateCountdown === 0 && !autoNavigateCancelled && nextModuleInfo?.nextModuleId) {
      // Auto-navigate to next module when countdown reaches 0
      router.push(`/employee/training/${nextModuleInfo.nextModuleId}`);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [autoNavigateCountdown, autoNavigateCancelled, nextModuleInfo, router]);

  const handleNextLesson = () => {
    if (nextModuleInfo?.nextModuleId) {
      router.push(`/employee/training/${nextModuleInfo.nextModuleId}`);
    } else {
      router.push("/employee/dashboard");
    }
  };

  const handleCancelAutoNavigate = () => {
    setAutoNavigateCancelled(true);
    setAutoNavigateCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  const handleBack = () => {
    router.push("/employee/dashboard");
  };

  const handleClaimCertificate = async () => {
    setClaimingCertificate(true);
    try {
      const response = await fetch("/api/employee/training/certificate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to claim certificate");
      }

      // Redirect to training list with success message
      router.push("/employee/dashboard?tab=training&certificateClaimed=true");
    } catch (err: any) {
      console.error("Error claiming certificate:", err);
      alert(err.message || "Failed to claim certificate. Please try again.");
    } finally {
      setClaimingCertificate(false);
    }
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
          currentModuleOrder={nextModuleInfo?.currentModuleOrder || 0}
          totalModules={nextModuleInfo?.totalModules || 0}
          onNextLesson={handleNextLesson}
          onRetake={() => {
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowFeedback(false);
            setAnswers({});
            setResults({});
            setSubmitted(false);
            setScore(null);
            setAutoNavigateCountdown(null);
            setAutoNavigateCancelled(false);
          }}
          onClaimCertificate={isLastModule && passed ? handleClaimCertificate : undefined}
        />
        
        {/* Auto-navigation countdown */}
        {passed && autoNavigateCountdown !== null && !autoNavigateCancelled && nextModuleInfo?.nextModuleId && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#1e40af", marginBottom: "0.5rem" }}>
              Auto-advancing to next lesson in {autoNavigateCountdown} second{autoNavigateCountdown !== 1 ? "s" : ""}...
            </div>
            <button
              onClick={handleCancelAutoNavigate}
              style={{
                padding: "0.5rem 1rem",
                background: "#ffffff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Stay on this page
            </button>
          </div>
        )}
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
