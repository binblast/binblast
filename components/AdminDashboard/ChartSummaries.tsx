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
    <div style={{ padding: "1rem" }}>
      <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
        Revenue Trend (Last 30 Days)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Revenue (30 days)</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Average Daily Revenue</span>
          <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)" }}>
            ${averageDaily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Highest Revenue Day</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600", color: "#16a34a" }}>
              ${highestDay.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{highestDay.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Lowest Revenue Day</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600", color: "#dc2626" }}>
              ${lowestDay.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{lowestDay.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Trend</span>
          <span style={{ 
            fontSize: "1rem", 
            fontWeight: "600", 
            color: isPositive ? "#16a34a" : "#dc2626",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}>
            {isPositive ? "↑" : "↓"} {trend.toFixed(1)}% vs previous period
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
    <div style={{ padding: "1rem" }}>
      <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
        Customer Growth (Last 6 Months)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Customers</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
            {totalCustomers.toLocaleString()}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>New This Month</span>
          <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "#16a34a" }}>
            {newThisMonth.toLocaleString()}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Growth Rate</span>
          <span style={{ fontSize: "1.125rem", fontWeight: "600", color: growthRate >= 0 ? "#16a34a" : "#dc2626" }}>
            {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Average per Month</span>
          <span style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)" }}>
            {averagePerMonth.toFixed(1)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Best Growth Month</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#16a34a" }}>
              {bestMonth.value.toLocaleString()} customers
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{bestMonth.label}</span>
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
    <div style={{ padding: "1rem" }}>
      <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
        Cleanings Completed (Weekly)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Cleanings (8 weeks)</span>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
            {totalCleanings.toLocaleString()}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Average per Week</span>
          <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)" }}>
            {averagePerWeek.toFixed(1)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Highest Week</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600", color: "#16a34a" }}>
              {highestWeek.value.toLocaleString()} cleanings
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{highestWeek.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Lowest Week</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600", color: "#dc2626" }}>
              {lowestWeek.value.toLocaleString()} cleanings
            </span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{lowestWeek.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Current Week</span>
          <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
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

  return (
    <div style={{ padding: "1rem" }}>
      <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
        Customers by Plan
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {data.map((plan, index) => {
          const percentage = total > 0 ? (plan.value / total) * 100 : 0;
          return (
            <div key={index} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              paddingBottom: index < data.length - 1 ? "0.75rem" : "0",
              borderBottom: index < data.length - 1 ? "1px solid #e5e7eb" : "none"
            }}>
              <span style={{ fontSize: "0.875rem", color: "var(--text-dark)", fontWeight: "500" }}>
                {plan.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {plan.value.toLocaleString()} customers
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ 
        paddingTop: "0.75rem", 
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Active Plans</span>
        <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
          {data.length}
        </span>
      </div>
      <div style={{ 
        marginTop: "0.75rem",
        padding: "0.75rem",
        background: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #bbf7d0"
      }}>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Most Popular Plan</div>
        <div style={{ fontSize: "1rem", fontWeight: "600", color: "#16a34a" }}>
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

  return (
    <div style={{ padding: "1rem" }}>
      <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
        Revenue by Plan Type
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {data.map((plan, index) => {
          const percentage = totalRevenue > 0 ? (plan.value / totalRevenue) * 100 : 0;
          return (
            <div key={index} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              paddingBottom: index < data.length - 1 ? "0.75rem" : "0",
              borderBottom: index < data.length - 1 ? "1px solid #e5e7eb" : "none"
            }}>
              <span style={{ fontSize: "0.875rem", color: "var(--text-dark)", fontWeight: "500" }}>
                {plan.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#16a34a" }}>
                  ${plan.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ 
        paddingTop: "0.75rem", 
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem"
      }}>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Revenue</span>
        <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
          ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div style={{ 
        padding: "0.75rem",
        background: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #bbf7d0"
      }}>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Highest Revenue Plan</div>
        <div style={{ fontSize: "1rem", fontWeight: "600", color: "#16a34a" }}>
          {highestRevenuePlan.label} at ${highestRevenuePlan.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

