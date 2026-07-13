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
      const duration = 800;
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
          onEarningAnimationComplete?.();
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

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "clamp(1rem, 4vw, 1.5rem)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e5e7eb",
    marginBottom: "1.5rem",
  } as const;

  if (!isClockedIn) {
    return (
      <div className="earnings-tracker" style={cardStyle}>
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
  const progressPercentage =
    maxEarnings > 0 ? Math.min((displayEarnings / maxEarnings) * 100, 100) : 0;
  const remainingJobs = Math.max(totalJobs - completedJobs, 0);
  const remainingEarnings = Math.max(maxEarnings - displayEarnings, 0);

  return (
    <div className="earnings-tracker" style={cardStyle}>
      <div
        style={{
          fontSize: "clamp(0.9375rem, 4vw, 1rem)",
          fontWeight: "600",
          marginBottom: "0.75rem",
          color: "#111827",
        }}
      >
        Earnings Today
      </div>

      {/* Primary earnings display */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
              fontWeight: "800",
              color: "#16a34a",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            ${displayEarnings.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
            earned today
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            ${maxEarnings.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
            route goal
          </div>
        </div>
      </div>

      {/* Progress bar — visual only, no overlapping labels */}
      <div
        style={{
          width: "100%",
          height: "10px",
          background: "#f3f4f6",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "0.5rem",
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: "100%",
            background: "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)",
            transition: isAnimating ? "none" : "width 0.8s ease-out",
            borderRadius: "999px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "#9ca3af",
          marginBottom: "0.75rem",
        }}
      >
        <span>{Math.round(progressPercentage)}% of goal</span>
        {remainingEarnings > 0 && (
          <span>${remainingEarnings.toFixed(2)} to go</span>
        )}
        {remainingEarnings === 0 && totalJobs > 0 && (
          <span style={{ color: "#16a34a", fontWeight: "600" }}>Goal reached!</span>
        )}
      </div>

      {/* Pay rate & completion stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
          paddingTop: "0.75rem",
          borderTop: "1px solid #e5e7eb",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontWeight: "600", color: "#111827" }}>
            ${payRatePerJob.toFixed(2)}
          </span>{" "}
          per clean
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#111827" }}>{completedJobs}</span>
          {" / "}
          <span style={{ fontWeight: "600", color: "#111827" }}>{totalJobs}</span>
          {" "}completed
        </div>
      </div>

      {remainingJobs > 0 && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.625rem 0.75rem",
            background: "#f0fdf4",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            color: "#166534",
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          {remainingJobs} stop{remainingJobs !== 1 ? "s" : ""} left on your route
        </div>
      )}

      {totalJobs >= 10 && remainingJobs === 0 && (
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
