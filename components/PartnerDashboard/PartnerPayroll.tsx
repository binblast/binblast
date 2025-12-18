// components/PartnerDashboard/PartnerPayroll.tsx
"use client";

import { useState, useEffect } from "react";

interface PayrollEmployee {
  employeeId: string;
  employeeName: string;
  email: string;
  payRatePerJob: number;
  completedJobs: number;
  totalEarnings: number;
  dateRange: string;
}

interface PayrollData {
  partnerId: string;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  employees: PayrollEmployee[];
  totals: {
    totalEmployees: number;
    totalJobs: number;
    totalPayroll: number;
  };
}

interface PartnerPayrollProps {
  partnerId: string;
  userId: string;
}

export function PartnerPayroll({ partnerId, userId }: PartnerPayrollProps) {
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    loadPayrollData();
  }, [partnerId]);

  async function loadPayrollData() {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        partnerId,
        userId,
      });
      
      if (filterApplied && startDate) {
        params.append("startDate", startDate);
      }
      if (filterApplied && endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/partners/team-members/payroll?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load payroll data");
      }

      const data = await response.json();
      setPayrollData(data);
    } catch (err: any) {
      console.error("Error loading payroll:", err);
      setError(err.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilter() {
    setFilterApplied(true);
    loadPayrollData();
  }

  function handleClearFilter() {
    setStartDate("");
    setEndDate("");
    setFilterApplied(false);
    loadPayrollData();
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading payroll data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", background: "#fef2f2", borderRadius: "8px", color: "#dc2626" }}>
        Error: {error}
      </div>
    );
  }

  if (!payrollData) {
    return null;
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "1.5rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e5e7eb",
      marginBottom: "2rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827" }}>Team Payroll</h2>
        <button
          onClick={loadPayrollData}
          style={{
            padding: "0.5rem 1rem",
            background: "#f3f4f6",
            color: "#374151",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Date Filter */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        padding: "1rem",
        background: "#f9fafb",
        borderRadius: "8px",
        flexWrap: "wrap",
        alignItems: "flex-end"
      }}>
        <div style={{ flex: "1", minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem"
            }}
          />
        </div>
        <div style={{ flex: "1", minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem"
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleApplyFilter}
            style={{
              padding: "0.5rem 1rem",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              border: "none"
            }}
          >
            Apply Filter
          </button>
          {filterApplied && (
            <button
              onClick={handleClearFilter}
              style={{
                padding: "0.5rem 1rem",
                background: "#f3f4f6",
                color: "#374151",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
                border: "none"
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem"
      }}>
        <div style={{
          padding: "1rem",
          background: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#0369a1", fontWeight: "600", marginBottom: "0.25rem" }}>
            Total Employees
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0c4a6e" }}>
            {payrollData.totals.totalEmployees}
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "600", marginBottom: "0.25rem" }}>
            Total Jobs Completed
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#14532d" }}>
            {payrollData.totals.totalJobs}
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#fef3c7",
          borderRadius: "8px",
          border: "1px solid #fde68a"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#92400e", fontWeight: "600", marginBottom: "0.25rem" }}>
            Total Payroll
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#78350f" }}>
            ${(payrollData.totals.totalPayroll / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Employee Payroll Table */}
      {payrollData.employees.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          No payroll data available for the selected period.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                  Employee
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                  Pay Rate
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                  Jobs Completed
                </th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                  Earnings
                </th>
              </tr>
            </thead>
            <tbody>
              {payrollData.employees.map((employee) => (
                <tr
                  key={employee.employeeId}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: "600", color: "#111827" }}>{employee.employeeName}</div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{employee.email}</div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>
                    ${(employee.payRatePerJob / 100).toFixed(2)} per job
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#374151" }}>
                    {employee.completedJobs}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "#111827" }}>
                    ${(employee.totalEarnings / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
                <td colSpan={3} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "700", color: "#111827" }}>
                  Total:
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "700", color: "#111827", fontSize: "1.125rem" }}>
                  ${(payrollData.totals.totalPayroll / 100).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {payrollData.period.startDate && payrollData.period.endDate && (
        <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280", textAlign: "center" }}>
          Period: {payrollData.period.startDate} to {payrollData.period.endDate}
        </div>
      )}
    </div>
  );
}
