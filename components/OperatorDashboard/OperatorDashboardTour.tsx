"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomerSubTab } from "@/lib/operator-customers";
import {
  OPERATOR_TOUR_STORAGE_KEY,
  OPERATOR_TOUR_STEPS,
  type OperatorTourPlacement,
  type OperatorTourTab,
  getOperatorTourTargetSelector,
} from "@/lib/operator-dashboard-tour";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

interface OperatorDashboardTourProps {
  activeTab: OperatorTourTab;
  onTabChange: (tab: OperatorTourTab) => void;
  onCustomerSubTabChange?: (tab: CustomerSubTab) => void;
}

function getTargetRect(target?: string, padding = 10): Rect | null {
  const selector = getOperatorTourTargetSelector(target);
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getTooltipPosition(
  rect: Rect | null,
  placement: OperatorTourPlacement,
  tooltipSize: { width: number; height: number }
): { top: number; left: number } {
  const margin = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!rect || placement === "center") {
    return {
      top: Math.max(margin, (viewportHeight - tooltipSize.height) / 2),
      left: Math.max(margin, (viewportWidth - Math.min(tooltipSize.width, viewportWidth - margin * 2)) / 2),
    };
  }

  let top = rect.top;
  let left = rect.left;

  if (placement === "bottom") {
    top = rect.top + rect.height + margin;
    left = rect.left + rect.width / 2 - tooltipSize.width / 2;
  } else if (placement === "top") {
    top = rect.top - tooltipSize.height - margin;
    left = rect.left + rect.width / 2 - tooltipSize.width / 2;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tooltipSize.height / 2;
    left = rect.left - tooltipSize.width - margin;
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - tooltipSize.height / 2;
    left = rect.left + rect.width + margin;
  }

  const maxLeft = viewportWidth - tooltipSize.width - margin;
  const maxTop = viewportHeight - tooltipSize.height - margin;

  return {
    top: Math.max(margin, Math.min(top, maxTop)),
    left: Math.max(margin, Math.min(left, maxLeft)),
  };
}

export function OperatorDashboardTour({
  activeTab,
  onTabChange,
  onCustomerSubTabChange,
}: OperatorDashboardTourProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [navigating, setNavigating] = useState(false);

  const step = OPERATOR_TOUR_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === OPERATOR_TOUR_STEPS.length - 1;

  const placement = step?.placement || (step?.target ? "bottom" : "center");

  const startTour = useCallback((fromBeginning = true) => {
    if (fromBeginning) {
      setStepIndex(0);
      onTabChange("overview");
    }
    setOpen(true);
  }, [onTabChange]);

  const closeTour = useCallback((markComplete = false) => {
    setOpen(false);
    if (markComplete && typeof window !== "undefined") {
      localStorage.setItem(OPERATOR_TOUR_STORAGE_KEY, "true");
    }
  }, []);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= OPERATOR_TOUR_STEPS.length) return;
      setStepIndex(nextIndex);
    },
    []
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      closeTour(true);
      return;
    }
    goToStep(stepIndex + 1);
  }, [closeTour, goToStep, isLastStep, stepIndex]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) goToStep(stepIndex - 1);
  }, [goToStep, isFirstStep, stepIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const completed = localStorage.getItem(OPERATOR_TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = window.setTimeout(() => startTour(true), 800);
      return () => window.clearTimeout(timer);
    }
  }, [mounted, startTour]);

  useEffect(() => {
    if (!open || !step) return;

    let cancelled = false;
    setNavigating(true);

    if (step.tab && step.tab !== activeTab) {
      onTabChange(step.tab);
    }
    if (step.customerSubTab) {
      onCustomerSubTabChange?.(step.customerSubTab);
    }

    const delay = step.navDelayMs ?? (step.tab ? 300 : 120);

    const timer = window.setTimeout(() => {
      if (cancelled) return;

      const rect = getTargetRect(step.target);
      if (rect && step.target) {
        const element = document.querySelector(getOperatorTourTargetSelector(step.target) || "");
        element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(() => {
          if (!cancelled) {
            setTargetRect(getTargetRect(step.target));
            setNavigating(false);
          }
        }, 280);
      } else {
        setTargetRect(null);
        setNavigating(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, activeTab, onTabChange, onCustomerSubTabChange]);

  useEffect(() => {
    if (!open || !step) return;

    function updateRect() {
      setTargetRect(getTargetRect(step.target));
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, step, stepIndex, navigating]);

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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeTour, handleBack, handleNext]);

  const tooltipPosition = useMemo(
    () =>
      getTooltipPosition(targetRect, placement, {
        width: Math.min(420, window.innerWidth - 32),
        height: 280,
      }),
    [targetRect, placement]
  );

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
              pointerEvents: "auto",
            }}
          >
            {targetRect && placement !== "center" ? (
              <div
                style={{
                  position: "fixed",
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                  borderRadius: "12px",
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.68)",
                  pointerEvents: "none",
                  transition: "all 0.25s ease",
                  zIndex: 10001,
                }}
              />
            ) : (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.68)",
                  zIndex: 10001,
                }}
              />
            )}

            <div
              style={{
                position: "fixed",
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                width: "min(420px, calc(100vw - 32px))",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 20px 50px rgba(15, 23, 42, 0.28)",
                padding: "1.25rem",
                zIndex: 10002,
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
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6b7280", letterSpacing: "0.04em" }}>
                  STEP {stepIndex + 1} OF {OPERATOR_TOUR_STEPS.length}
                </div>
                <button
                  type="button"
                  onClick={() => closeTour(false)}
                  aria-label="Close tour"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9ca3af",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
                {step.title}
              </h3>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#4b5563" }}>
                {step.body}
              </p>

              {step.bullets && step.bullets.length > 0 && (
                <ul
                  style={{
                    margin: "0 0 1rem",
                    paddingLeft: "1.1rem",
                    color: "#374151",
                    fontSize: "0.85rem",
                    lineHeight: 1.55,
                  }}
                >
                  {step.bullets.map((bullet) => (
                    <li key={bullet} style={{ marginBottom: "0.35rem" }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {navigating && (
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.75rem" }}>
                  Loading this section...
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFirstStep}
                  style={{
                    padding: "0.55rem 0.9rem",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: isFirstStep ? "#9ca3af" : "#374151",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    cursor: isFirstStep ? "not-allowed" : "pointer",
                  }}
                >
                  Back
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => closeTour(true)}
                    style={{
                      padding: "0.55rem 0.9rem",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      color: "#6b7280",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Skip Tour
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: "10px",
                      border: "none",
                      background: "#16a34a",
                      color: "#ffffff",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    {isLastStep ? "Finish" : "Next"}
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
