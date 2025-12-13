// components/AdminDashboard/ChartModal.tsx
"use client";

import React, { useEffect } from "react";
import { LineChart, BarChart, PieChart } from "./ChartComponents";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: "line" | "bar" | "pie";
  title: string;
  data: ChartDataPoint[];
}

export function ChartModal({
  isOpen,
  onClose,
  chartType,
  title,
  data,
}: ChartModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine chart height/size based on type
  const chartHeight = chartType === "pie" ? 500 : 500;
  const pieSize = 500;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "2rem",
        animation: "fadeIn 0.2s ease-in",
      }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "2rem",
          maxWidth: "90vw",
          maxHeight: "90vh",
          width: "100%",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "slideUp 0.3s ease-out",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            color: "#6b7280",
            cursor: "pointer",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
            e.currentTarget.style.color = "#111827";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#6b7280";
          }}
          aria-label="Close chart modal"
        >
          ×
        </button>

        {/* Chart Title */}
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "var(--text-dark)",
            marginBottom: "2rem",
            paddingRight: "3rem",
          }}
        >
          {title}
        </h2>

        {/* Chart Container */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: chartType === "pie" ? `${pieSize}px` : `${chartHeight}px`,
          }}
        >
          {chartType === "line" && (
            <LineChart data={data} height={chartHeight} />
          )}
          {chartType === "bar" && (
            <BarChart data={data} height={chartHeight} />
          )}
          {chartType === "pie" && (
            <PieChart data={data} size={pieSize} />
          )}
        </div>

        {/* Close Button at Bottom */}
        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 2rem",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#15803d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#16a34a";
            }}
          >
            Close
          </button>
        </div>
      </div>

    </div>
  );
}

