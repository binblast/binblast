// components/AdminDashboard/KPICard.tsx
"use client";

import { useEffect, useState } from "react";

interface KPICardProps {
  title: string;
  value: number | string;
  color?: "green" | "blue" | "purple" | "orange" | "neutral";
  icon?: string;
  delay?: number;
  formatValue?: (val: number) => string;
}

const colorConfig = {
  green: {
    gradient: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
    border: "#86efac",
    text: "#16a34a",
    iconBg: "#16a34a",
  },
  blue: {
    gradient: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    border: "#93c5fd",
    text: "#2563eb",
    iconBg: "#2563eb",
  },
  purple: {
    gradient: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
    border: "#c084fc",
    text: "#9333ea",
    iconBg: "#9333ea",
  },
  orange: {
    gradient: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)",
    border: "#fb923c",
    text: "#ea580c",
    iconBg: "#ea580c",
  },
  neutral: {
    gradient: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
    border: "#d1d5db",
    text: "var(--text-dark)",
    iconBg: "#6b7280",
  },
};

export function KPICard({ title, value, color = "neutral", icon, delay = 0, formatValue }: KPICardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(0);
  const [isVisible, setIsVisible] = useState(false);
  const config = colorConfig[color];

  useEffect(() => {
    // Trigger animation after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (typeof value === "number" && isVisible) {
      // Animate number counting
      const startValue = 0;
      const endValue = value;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = startValue + (endValue - startValue) * progress;
        
        if (formatValue) {
          setDisplayValue(formatValue(Math.floor(currentValue)));
        } else {
          setDisplayValue(Math.floor(currentValue));
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(formatValue ? formatValue(endValue) : endValue);
        }
      };

      animate();
    } else {
      setDisplayValue(value);
    }
  }, [value, isVisible, formatValue]);

  return (
    <div
      className="card-hover"
      style={{
        background: config.gradient,
        borderRadius: "16px",
        padding: "1.75rem",
        border: `2px solid ${config.border}`,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "transform",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
      }}
    >
      {/* Decorative corner element */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.iconBg}15 0%, transparent 70%)`,
          opacity: 0.6,
        }}
      />
      
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: "0.75rem"
        }}>
          <div style={{ 
            fontSize: "0.75rem", 
            color: config.text, 
            fontWeight: "700", 
            textTransform: "uppercase", 
            letterSpacing: "0.1em",
            opacity: 0.8
          }}>
            {title}
          </div>
          {icon && (
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: `${config.iconBg}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}
            >
              {icon}
            </div>
          )}
        </div>
        <div 
          style={{ 
            fontSize: "2.5rem", 
            fontWeight: "800", 
            color: config.text,
            lineHeight: "1.2",
            transition: "transform 0.2s ease",
          }}
          className="animate-count-up"
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
}

