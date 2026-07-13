"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomerSubTab } from "@/lib/operator-customers";
import { OperatorTourSlidePreview } from "@/components/OperatorDashboard/OperatorTourSlidePreview";
import {
  OPERATOR_TOUR_STORAGE_KEY,
  OPERATOR_TOUR_STEPS,
  type OperatorTourTab,
} from "@/lib/operator-dashboard-tour";

interface OperatorDashboardTourProps {
  activeTab: OperatorTourTab;
  onTabChange: (tab: OperatorTourTab) => void;
  onCustomerSubTabChange?: (tab: CustomerSubTab) => void;
}

function renderTitle(title: string, accent?: string) {
  if (!accent) return title;

  const lowerTitle = title.toLowerCase();
  const lowerAccent = accent.toLowerCase();
  const start = lowerTitle.indexOf(lowerAccent);

  if (start !== -1) {
    const end = start + accent.length;
    return (
      <>
        {title.slice(0, start)}
        <span
          style={{
            background: "linear-gradient(135deg, #4ade80 0%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title.slice(start, end)}
        </span>
        {title.slice(end)}
      </>
    );
  }

  return (
    <>
      {title}
      <span
        style={{
          display: "block",
          marginTop: "0.35rem",
          fontSize: "0.95em",
          background: "linear-gradient(135deg, #4ade80 0%, #60a5fa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {accent}
      </span>
    </>
  );
}

export function OperatorDashboardTour({
  onTabChange,
  onCustomerSubTabChange,
}: OperatorDashboardTourProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"next" | "back">("next");

  const step = OPERATOR_TOUR_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === OPERATOR_TOUR_STEPS.length - 1;
  const progress = ((stepIndex + 1) / OPERATOR_TOUR_STEPS.length) * 100;

  const startTour = useCallback(
    (fromBeginning = true) => {
      if (fromBeginning) {
        setStepIndex(0);
        setSlideDirection("next");
      }
      setOpen(true);
    },
    []
  );

  const closeTour = useCallback(
    (markComplete = false) => {
      setOpen(false);
      if ((markComplete || dontShowAgain) && typeof window !== "undefined") {
        localStorage.setItem(OPERATOR_TOUR_STORAGE_KEY, "true");
      }
    },
    [dontShowAgain]
  );

  const goToStep = useCallback((nextIndex: number, direction: "next" | "back") => {
    if (nextIndex < 0 || nextIndex >= OPERATOR_TOUR_STEPS.length) return;
    setSlideDirection(direction);
    setStepIndex(nextIndex);
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      closeTour(true);
      return;
    }
    goToStep(stepIndex + 1, "next");
  }, [closeTour, goToStep, isLastStep, stepIndex]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) goToStep(stepIndex - 1, "back");
  }, [goToStep, isFirstStep, stepIndex]);

  const goToSection = useCallback(() => {
    if (!step?.tab) return;
    onTabChange(step.tab);
    if (step.customerSubTab) {
      onCustomerSubTabChange?.(step.customerSubTab);
    }
    closeTour(false);
  }, [closeTour, onCustomerSubTabChange, onTabChange, step]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const completed = localStorage.getItem(OPERATOR_TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = window.setTimeout(() => startTour(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, [mounted, startTour]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeTour(false);
      } else if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "ArrowLeft") {
        handleBack();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeTour, handleBack, handleNext]);

  if (!mounted || !step) return null;

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => startTour(true)}
          title="Operator dashboard tour"
          aria-label="Start operator dashboard tour"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#2563eb",
            fontSize: "1.125rem",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => startTour(true)}
          style={{
            padding: "0.55rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: "0.8125rem",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Take a Tour
        </button>
      </div>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(8, 12, 22, 0.82)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeTour(false);
            }}
          >
            <div
              style={{
                width: "min(920px, 100%)",
                maxHeight: "min(90vh, 720px)",
                background: "linear-gradient(180deg, #151a28 0%, #0f131d 100%)",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: `${slideDirection === "next" ? "tourSlideInRight" : "tourSlideInLeft"} 0.28s ease`,
              }}
            >
              <style>{`
                @keyframes tourSlideInRight {
                  from { opacity: 0; transform: translateX(24px); }
                  to { opacity: 1; transform: translateX(0); }
                }
                @keyframes tourSlideInLeft {
                  from { opacity: 0; transform: translateX(-24px); }
                  to { opacity: 1; transform: translateX(0); }
                }
              `}</style>

              {/* Top bar */}
              <div
                style={{
                  padding: "1rem 1.25rem 0.75rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.3rem 0.65rem",
                        borderRadius: "999px",
                        background: "rgba(37,99,235,0.15)",
                        border: "1px solid rgba(96,165,250,0.25)",
                        color: "#93c5fd",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#60a5fa",
                          boxShadow: "0 0 6px #60a5fa",
                        }}
                      />
                      OPERATOR TOUR
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                      {stepIndex + 1} of {OPERATOR_TOUR_STEPS.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => closeTour(false)}
                    aria-label="Close tour"
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.06)",
                      color: "#94a3b8",
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      fontSize: "1.1rem",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    height: "3px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #16a34a 0%, #3b82f6 100%)",
                      borderRadius: "999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                  gap: "1.25rem",
                  padding: "1.25rem",
                  overflowY: "auto",
                  flex: 1,
                }}
                className="operator-tour-body"
              >
                <style>{`
                  @media (max-width: 720px) {
                    .operator-tour-body {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>

                <div>
                  <h2
                    style={{
                      margin: "0 0 0.65rem",
                      fontSize: "clamp(1.25rem, 3vw, 1.65rem)",
                      fontWeight: 800,
                      color: "#f8fafc",
                      lineHeight: 1.25,
                    }}
                  >
                    {renderTitle(step.title, step.accent)}
                  </h2>
                  <p
                    style={{
                      margin: "0 0 1rem",
                      fontSize: "0.9rem",
                      lineHeight: 1.65,
                      color: "#94a3b8",
                    }}
                  >
                    {step.body}
                  </p>

                  {step.highlights && step.highlights.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                      }}
                    >
                      {step.highlights.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            padding: "0.65rem 0.75rem",
                          }}
                        >
                          <div style={{ fontSize: "0.65rem", color: "#64748b", marginBottom: "0.15rem" }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.bullets && step.bullets.length > 0 && (
                    <ul
                      style={{
                        margin: "0 0 1rem",
                        paddingLeft: "1.1rem",
                        color: "#cbd5e1",
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                      }}
                    >
                      {step.bullets.map((bullet) => (
                        <li key={bullet} style={{ marginBottom: "0.3rem" }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.examples && step.examples.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#64748b",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        Real-world examples
                      </div>
                      {step.examples.map((example) => (
                        <div
                          key={example.scenario}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "10px",
                            padding: "0.75rem 0.875rem",
                            fontSize: "0.8rem",
                            lineHeight: 1.55,
                          }}
                        >
                          <div style={{ color: "#e2e8f0", marginBottom: "0.3rem" }}>
                            <span style={{ color: "#fbbf24", fontWeight: 700 }}>Scenario: </span>
                            {example.scenario}
                          </div>
                          <div style={{ color: "#94a3b8" }}>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>What to do: </span>
                            {example.action}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ minHeight: "260px" }}>
                  <OperatorTourSlidePreview previewId={step.preview} />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.25rem 1.15rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.55rem" }}>
                    {OPERATOR_TOUR_STEPS.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => goToStep(index, index > stepIndex ? "next" : "back")}
                        aria-label={`Go to slide ${index + 1}`}
                        style={{
                          width: index === stepIndex ? "20px" : "8px",
                          height: "8px",
                          borderRadius: "999px",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          background:
                            index === stepIndex
                              ? "linear-gradient(90deg, #16a34a, #3b82f6)"
                              : index < stepIndex
                                ? "rgba(74,222,128,0.5)"
                                : "rgba(255,255,255,0.15)",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(event) => setDontShowAgain(event.target.checked)}
                      style={{ accentColor: "#16a34a" }}
                    />
                    Don&apos;t show this again on login
                  </label>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {step.tab && !isLastStep && (
                    <button
                      type="button"
                      onClick={goToSection}
                      style={{
                        padding: "0.6rem 0.9rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#94a3b8",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Open in dashboard →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isFirstStep}
                    style={{
                      padding: "0.6rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: isFirstStep ? "#475569" : "#cbd5e1",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: isFirstStep ? "not-allowed" : "pointer",
                    }}
                  >
                    Back
                  </button>
                  {!isLastStep && (
                    <button
                      type="button"
                      onClick={() => closeTour(dontShowAgain)}
                      style={{
                        padding: "0.6rem 0.9rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "transparent",
                        color: "#64748b",
                        fontSize: "0.8125rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      padding: "0.6rem 1.15rem",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                      color: "#ffffff",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
                    }}
                  >
                    {isLastStep ? "Start Operating" : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
