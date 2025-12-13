// components/AdminDashboard/ChartSummaries.tsx
"use client";

import React from "react";

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface RevenueTrendSummaryProps {
  data: ChartDataPoint[];
}

export function RevenueTrendSummary({ data }: RevenueTrendSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
  const averageDaily = totalRevenue / data.length;
  const highestDay = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);
  const lowestDay = data.reduce((min, d) => (d.value < min.value ? d : min), data[0]);
  
  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint).reduce((sum, d) => sum + d.value, 0);
  const secondHalf = data.slice(midpoint).reduce((sum, d) => sum + d.value, 0);
  const trend = secondHalf > firstHalf ? ((secondHalf - firstHalf) / firstHalf) * 100 : ((firstHalf - secondHalf) / firstHalf) * 100;
  const isPositive = secondHalf >= firstHalf;

  return (
    <div 
      className="card-hover"
      style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        borderRadius: "16px",
        border: "2px solid #e5e7eb",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.borderColor = "#16a34a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>📈</span>
        Revenue Trend (Last 30 Days)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "1rem",
          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          borderRadius: "12px",
          border: "1px solid #86efac"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "600" }}>Total Revenue (30 days)</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "#16a34a" }}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f9fafb",
          borderRadius: "10px"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>Average Daily Revenue</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
            ${averageDaily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f0fdf4",
          borderRadius: "10px",
          border: "1px solid #bbf7d0"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "500" }}>Highest Revenue Day</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.375rem", fontWeight: "700", color: "#16a34a" }}>
              ${highestDay.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{highestDay.label}</span>
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#fef2f2",
          borderRadius: "10px",
          border: "1px solid #fecaca"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#991b1b", fontWeight: "500" }}>Lowest Revenue Day</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.375rem", fontWeight: "700", color: "#dc2626" }}>
              ${lowestDay.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{lowestDay.label}</span>
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "1rem",
          background: isPositive ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
          borderRadius: "12px",
          border: `2px solid ${isPositive ? "#86efac" : "#fca5a5"}`
        }}>
          <span style={{ fontSize: "0.875rem", color: isPositive ? "#166534" : "#991b1b", fontWeight: "600" }}>Trend</span>
          <span style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            color: isPositive ? "#16a34a" : "#dc2626",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span style={{ fontSize: "1.5rem" }}>{isPositive ? "↑" : "↓"}</span>
            {trend.toFixed(1)}% vs previous period
          </span>
        </div>
      </div>
    </div>
  );
}

interface CustomerGrowthSummaryProps {
  data: ChartDataPoint[];
}

export function CustomerGrowthSummary({ data }: CustomerGrowthSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const totalCustomers = data.reduce((sum, d) => sum + d.value, 0);
  const newThisMonth = data[data.length - 1]?.value || 0;
  const averagePerMonth = totalCustomers / data.length;
  const bestMonth = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);
  
  // Calculate growth rate (compare last month to previous month)
  const lastMonth = data[data.length - 1]?.value || 0;
  const previousMonth = data[data.length - 2]?.value || 0;
  const growthRate = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;

  return (
    <div 
      className="card-hover"
      style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
        borderRadius: "16px",
        border: "2px solid #bfdbfe",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.borderColor = "#3b82f6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#bfdbfe";
      }}
    >
      <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>👥</span>
        Customer Growth (Last 6 Months)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "1rem",
          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
          borderRadius: "12px",
          border: "1px solid #93c5fd"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#1e40af", fontWeight: "600" }}>Total Customers</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "#2563eb" }}>
            {totalCustomers.toLocaleString()}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f0fdf4",
          borderRadius: "10px",
          border: "1px solid #bbf7d0"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "500" }}>New This Month</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            {newThisMonth.toLocaleString()}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: growthRate >= 0 ? "#f0fdf4" : "#fef2f2",
          borderRadius: "10px",
          border: `1px solid ${growthRate >= 0 ? "#bbf7d0" : "#fecaca"}`
        }}>
          <span style={{ fontSize: "0.875rem", color: growthRate >= 0 ? "#166534" : "#991b1b", fontWeight: "500" }}>Growth Rate</span>
          <span style={{ fontSize: "1.375rem", fontWeight: "700", color: growthRate >= 0 ? "#16a34a" : "#dc2626" }}>
            {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f9fafb",
          borderRadius: "10px"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>Average per Month</span>
          <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)" }}>
            {averagePerMonth.toFixed(1)}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "1rem",
          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          borderRadius: "12px",
          border: "2px solid #86efac"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "600" }}>Best Growth Month</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
              {bestMonth.value.toLocaleString()} customers
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{bestMonth.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WeeklyCleaningsSummaryProps {
  data: ChartDataPoint[];
}

export function WeeklyCleaningsSummary({ data }: WeeklyCleaningsSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const totalCleanings = data.reduce((sum, d) => sum + d.value, 0);
  const averagePerWeek = totalCleanings / data.length;
  const highestWeek = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);
  const lowestWeek = data.reduce((min, d) => (d.value < min.value ? d : min), data[0]);
  const currentWeek = data[data.length - 1]?.value || 0;

  return (
    <div 
      className="card-hover"
      style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
        borderRadius: "16px",
        border: "2px solid #fde68a",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.borderColor = "#f59e0b";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#fde68a";
      }}
    >
      <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>🧹</span>
        Cleanings Completed (Weekly)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "1rem",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          borderRadius: "12px",
          border: "1px solid #fcd34d"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#92400e", fontWeight: "600" }}>Total Cleanings (8 weeks)</span>
          <span style={{ fontSize: "2rem", fontWeight: "800", color: "#d97706" }}>
            {totalCleanings.toLocaleString()}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f9fafb",
          borderRadius: "10px"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>Average per Week</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
            {averagePerWeek.toFixed(1)}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#f0fdf4",
          borderRadius: "10px",
          border: "1px solid #bbf7d0"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "500" }}>Highest Week</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.375rem", fontWeight: "700", color: "#16a34a" }}>
              {highestWeek.value.toLocaleString()} cleanings
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{highestWeek.label}</span>
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "0.875rem",
          background: "#fef2f2",
          borderRadius: "10px",
          border: "1px solid #fecaca"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#991b1b", fontWeight: "500" }}>Lowest Week</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.375rem", fontWeight: "700", color: "#dc2626" }}>
              {lowestWeek.value.toLocaleString()} cleanings
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{lowestWeek.label}</span>
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "1rem",
          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
          borderRadius: "12px",
          border: "2px solid #93c5fd"
        }}>
          <span style={{ fontSize: "0.875rem", color: "#1e40af", fontWeight: "600" }}>Current Week</span>
          <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#2563eb" }}>
            {currentWeek.toLocaleString()} cleanings (in progress)
          </span>
        </div>
      </div>
    </div>
  );
}

interface PlanDistributionSummaryProps {
  data: ChartDataPoint[];
}

export function PlanDistributionSummary({ data }: PlanDistributionSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const mostPopular = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);

  const colors = ["#16a34a", "#2563eb", "#9333ea", "#ea580c", "#dc2626", "#06b6d4"];
  
  return (
    <div 
      className="card-hover"
      style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)",
        borderRadius: "16px",
        border: "2px solid #e9d5ff",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.borderColor = "#9333ea";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e9d5ff";
      }}
    >
      <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>📋</span>
        Customers by Plan
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
        {data.map((plan, index) => {
          const percentage = total > 0 ? (plan.value / total) * 100 : 0;
          const color = colors[index % colors.length];
          return (
            <div 
              key={index} 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "1rem",
                background: `${color}10`,
                borderRadius: "12px",
                border: `2px solid ${color}40`,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}20`;
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${color}10`;
                e.currentTarget.style.borderColor = `${color}40`;
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px ${color}60`
                }} />
                <span style={{ fontSize: "0.875rem", color: "var(--text-dark)", fontWeight: "600" }}>
                  {plan.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: "700", color: color }}>
                  {plan.value.toLocaleString()}
                </span>
                <span style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  background: "#f3f4f6",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  fontWeight: "600"
                }}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ 
        padding: "1rem",
        background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
        borderRadius: "12px",
        border: "2px solid #86efac",
        marginTop: "1rem"
      }}>
        <div style={{ fontSize: "0.75rem", color: "#166534", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Popular Plan</div>
        <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
          {mostPopular.label} with {mostPopular.value.toLocaleString()} customers
        </div>
      </div>
    </div>
  );
}

interface RevenueByPlanSummaryProps {
  data: ChartDataPoint[];
}

export function RevenueByPlanSummary({ data }: RevenueByPlanSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No data available
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
  const highestRevenuePlan = data.reduce((max, d) => (d.value > max.value ? d : max), data[0]);

  const colors = ["#16a34a", "#2563eb", "#9333ea", "#ea580c", "#dc2626", "#06b6d4"];
  
  return (
    <div 
      className="card-hover"
      style={{ 
        padding: "1.5rem",
        background: "linear-gradient(135deg, #ffffff 0%, #dcfce7 100%)",
        borderRadius: "16px",
        border: "2px solid #bbf7d0",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.borderColor = "#16a34a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#bbf7d0";
      }}
    >
      <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>💵</span>
        Revenue by Plan Type
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
        {data.map((plan, index) => {
          const percentage = totalRevenue > 0 ? (plan.value / totalRevenue) * 100 : 0;
          const color = colors[index % colors.length];
          const barWidth = percentage;
          return (
            <div 
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "0.875rem",
                background: `${color}10`,
                borderRadius: "10px",
                border: `2px solid ${color}40`,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}20`;
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${color}10`;
                e.currentTarget.style.borderColor = `${color}40`;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px ${color}60`
                }} />
                <span style={{ fontSize: "0.875rem", color: "var(--text-dark)", fontWeight: "600" }}>
                  {plan.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: "700", color: color }}>
                  ${plan.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  background: "#f3f4f6",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  fontWeight: "600"
                }}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div style={{
              width: "100%",
              height: "6px",
              background: "#e5e7eb",
              borderRadius: "3px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${barWidth}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
                borderRadius: "3px",
                transition: "width 0.6s ease"
              }} />
            </div>
          </div>
          );
        })}
      </div>
      <div style={{ 
        padding: "1rem",
        background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
        borderRadius: "12px",
        border: "2px solid #86efac",
        marginBottom: "1rem"
      }}>
        <div style={{ fontSize: "0.75rem", color: "#166534", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Revenue</div>
        <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#16a34a" }}>
          ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div style={{ 
        padding: "1rem",
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        borderRadius: "12px",
        border: "2px solid #fcd34d"
      }}>
        <div style={{ fontSize: "0.75rem", color: "#92400e", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Highest Revenue Plan</div>
        <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#d97706" }}>
          {highestRevenuePlan.label} at ${highestRevenuePlan.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

