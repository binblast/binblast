// components/EmployeeDashboard/LiveEarningsTracker.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface LiveEarningsTrackerProps {
  completedJobs: number;
  payRatePerJob: number;
  estimatedPay: number;
  isClockedIn: boolean;
  totalJobs: number;
  onEarningAnimationComplete?: () => void;
}

export function LiveEarningsTracker({
  completedJobs,
  payRatePerJob,
  estimatedPay,
  isClockedIn,
  totalJobs,
  onEarningAnimationComplete,
}: LiveEarningsTrackerProps) {
  const [displayEarnings, setDisplayEarnings] = useState(estimatedPay);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousEarningsRef = useRef(estimatedPay);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (previousEarningsRef.current !== estimatedPay && estimatedPay > 0) {
      setIsAnimating(true);
      const startValue = previousEarningsRef.current;
      const endValue = estimatedPay;
      const duration = 800; // ms
      const steps = 30;
      const increment = (endValue - startValue) / steps;
      let currentStep = 0;

      const animate = () => {
        currentStep++;
        const currentValue = startValue + increment * currentStep;
        setDisplayEarnings(Math.min(currentValue, endValue));

        if (currentStep < steps) {
          animationTimeoutRef.current = setTimeout(animate, duration / steps);
        } else {
          setIsAnimating(false);
          previousEarningsRef.current = endValue;
          if (onEarningAnimationComplete) {
            onEarningAnimationComplete();
          }
        }
      };

      animate();
    } else {
      setDisplayEarnings(estimatedPay);
      previousEarningsRef.current = estimatedPay;
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [estimatedPay, onEarningAnimationComplete]);

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
          Earnings Today
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Clock in to start earning
        </div>
      </div>
    );
  }

  const maxEarnings = totalJobs > 0 ? totalJobs * payRatePerJob : payRatePerJob;
  const progressPercentage = maxEarnings > 0 ? (displayEarnings / maxEarnings) * 100 : 0;

  return (
    <div
      className="earnings-tracker"
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "clamp(1rem, 4vw, 1.5rem)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          fontSize: "clamp(0.9375rem, 4vw, 1rem)",
          fontWeight: "600",
          marginBottom: "1rem",
          color: "#111827",
        }}
      >
        Earnings Today
      </div>

      {/* Earnings Progress Bar */}
      <div
        className="progress-bar"
        style={{
          width: "100%",
          height: "clamp(28px, 6vw, 32px)",
          background: "#f3f4f6",
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: "1rem",
          position: "relative",
          border: "2px solid #e5e7eb",
        }}
      >
        <div
          style={{
            width: `${Math.min(progressPercentage, 100)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)",
            transition: isAnimating ? "none" : "width 0.8s ease-out",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "0.75rem",
          }}
        >
          {progressPercentage > 15 && (
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                color: "#ffffff",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              }}
            >
              ${displayEarnings.toFixed(2)}
            </span>
          )}
        </div>
        {progressPercentage <= 15 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "0.75rem",
              transform: "translateY(-50%)",
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            ${displayEarnings.toFixed(2)}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "0.75rem",
            transform: "translateY(-50%)",
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#6b7280",
          }}
        >
          ${maxEarnings.toFixed(2)} est.
        </div>
      </div>

      {/* Pay Rate Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
          paddingTop: "0.75rem",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div>
          <span style={{ fontWeight: "600" }}>${payRatePerJob.toFixed(2)}</span> per clean
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#111827" }}>
            {completedJobs}
          </span>{" "}
          completed
        </div>
      </div>

      {/* Bonus Rules (if applicable) */}
      {totalJobs >= 10 && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "#fef3c7",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            color: "#92400e",
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          Great work! Keep it up!
        </div>
      )}
    </div>
  );
}

