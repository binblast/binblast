// components/AdminDashboard/ChartComponents.tsx
"use client";

import React from "react";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  title?: string;
}

export function LineChart({ data, height = 200, title }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  const width = 100;
  const chartHeight = height - 40;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = chartHeight - ((point.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ padding: "1rem" }}>
      {title && (
        <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
          {title}
        </h4>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${chartHeight + 20}`} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1="0"
            y1={chartHeight * ratio}
            x2={width}
            y2={chartHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
        />
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = chartHeight - ((point.value - minValue) / range) * chartHeight;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#16a34a"
            />
          );
        })}
        {/* Labels */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          return (
            <text
              key={index}
              x={x}
              y={chartHeight + 15}
              fontSize="8"
              fill="#6b7280"
              textAnchor="middle"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
      {/* Y-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
        <span>{minValue.toLocaleString()}</span>
        <span>{maxValue.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: ChartDataPoint[];
  height?: number;
  title?: string;
}

export function BarChart({ data, height = 200, title }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 100 / data.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  return (
    <div style={{ padding: "1rem" }}>
      {title && (
        <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
          {title}
        </h4>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: `${height}px` }}>
        {data.map((point, index) => {
          const barHeight = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          return (
            <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "100%",
                  height: `${barHeight}%`,
                  background: point.color || "#16a34a",
                  borderRadius: "4px 4px 0 0",
                  minHeight: point.value > 0 ? "4px" : "0",
                  transition: "height 0.3s ease",
                }}
                title={`${point.label}: ${point.value.toLocaleString()}`}
              />
              <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.5rem", textAlign: "center", wordBreak: "break-word" }}>
                {point.label}
              </div>
              <div style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--text-dark)", marginTop: "0.25rem" }}>
                {point.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: ChartDataPoint[];
  size?: number;
  title?: string;
}

export function PieChart({ data, size = 200, title }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const radius = size / 2 - 10;
  const center = size / 2;
  let currentAngle = -90; // Start from top

  const colors = [
    "#16a34a", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"
  ];

  const segments = data.map((point, index) => {
    const percentage = (point.value / total) * 100;
    const angle = (point.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z"
    ].join(" ");

    return {
      pathData,
      color: point.color || colors[index % colors.length],
      label: point.label,
      value: point.value,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div style={{ padding: "1rem" }}>
      {title && (
        <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
          {title}
        </h4>
      )}
      <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.pathData}
              fill={segment.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
          {segments.map((segment, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  background: segment.color,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {segment.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {segment.value.toLocaleString()} ({segment.percentage}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

