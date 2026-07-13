"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";
import {
  FleetPayrollEmployeeSummary,
  formatClockRange,
  formatCurrency,
  formatHours,
} from "@/lib/operator-fleet-payroll";

interface FleetPayrollResponse {
  today: string;
  weekStart: string;
  weekEnd: string;
  totals: {
    todayHours: number;
    todayBins: number;
    todayEarnings: number;
    weekHours: number;
    weekBins: number;
    weekEarnings: number;
  };
  operatorTotals?: {
    todayHours: number;
    todayPay: number;
    weekHours: number;
    weekPay: number;
  };
  employees: FleetPayrollEmployeeSummary[];
  operators?: Array<{
    operatorId: string;
    name: string;
    email: string;
    hourlyRate: number;
    isClockedIn: boolean;
    todayHours: number;
    todayPay: number;
    weekHours: number;
    weekPay: number;
  }>;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function FleetPayrollPanel() {
  const router = useRouter();
  const [data, setData] = useState<FleetPayrollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadPayroll = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/operator/fleet/payroll", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load hours and pay");
      }

      setData(payload);
      setError(null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load hours and pay");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayroll();
    const pollInterval = window.setInterval(() => loadPayroll(true), 30000);
    return () => window.clearInterval(pollInterval);
  }, [loadPayroll]);

  const weekLabel = useMemo(() => {
    if (!data) return "";
    const start = new Date(`${data.weekStart}T12:00:00`);
    const end = new Date(`${data.weekEnd}T12:00:00`);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["Field Employee Hours & Pay"],
      [
        "Employee",
        "Email",
        "Hours Today",
        "Bins Today",
        "Pay Today",
        "Hours Week",
        "Bins Week",
        "Pay Week",
        "Jobs Paid Today",
        "Jobs Paid Week",
      ],
      ...data.employees.map((employee) => [
        employee.name,
        employee.email,
        formatHours(employee.today.hoursWorked),
        String(employee.today.binsCleaned),
        employee.isPartnerEmployee ? "Partner payroll" : employee.today.earnings.toFixed(2),
        formatHours(employee.week.hoursWorked),
        String(employee.week.binsCleaned),
        employee.isPartnerEmployee ? "Partner payroll" : employee.week.earnings.toFixed(2),
        String(employee.today.jobsEligible),
        String(employee.week.jobsEligible),
      ]),
    ];

    if (data.operators && data.operators.length > 0) {
      rows.push([]);
      rows.push(["Operator Hours & Pay"]);
      rows.push([
        "Operator",
        "Email",
        "Status",
        "Hours Today",
        "Pay Today",
        "Hours Week",
        "Pay Week",
        "Hourly Rate",
        "Week Start",
        "Week End",
      ]);
      rows.push(
        ...data.operators.map((operator) => [
          operator.name,
          operator.email,
          operator.isClockedIn ? "On Shift" : "Off Shift",
          formatHours(operator.todayHours),
          operator.hourlyRate > 0 ? operator.todayPay.toFixed(2) : "",
          formatHours(operator.weekHours),
          operator.hourlyRate > 0 ? operator.weekPay.toFixed(2) : "",
          operator.hourlyRate > 0 ? operator.hourlyRate.toFixed(2) : "",
          data.weekStart,
          data.weekEnd,
        ])
      );
    }

    downloadCsv(`fleet-hours-pay-${data.weekStart}.csv`, rows);
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading hours and pay...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        No payroll data available.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Hours & Pay
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0.35rem 0 0" }}>
            Per-bin employee pay from owner settings — independent of customer pricing.
          </p>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.35rem" }}>
            Week of {weekLabel}
            {lastSync ? ` · Updated ${lastSync.toLocaleTimeString()}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <OperatorActionButton variant="neutral" size="sm" onClick={exportCsv}>
            Export CSV
          </OperatorActionButton>
          <OperatorActionButton variant="neutral" size="sm" onClick={() => window.print()}>
            Export PDF
          </OperatorActionButton>
          <OperatorActionButton variant="neutral" size="sm" onClick={() => loadPayroll(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </OperatorActionButton>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        {[
          { label: "Hours Today", value: formatHours(data.totals.todayHours), color: "#2563eb" },
          { label: "Bins Today", value: String(data.totals.todayBins), color: "#7c3aed" },
          { label: "Pay Today", value: formatCurrency(data.totals.todayEarnings), color: "#16a34a" },
          { label: "Hours This Week", value: formatHours(data.totals.weekHours), color: "#111827" },
          { label: "Bins This Week", value: String(data.totals.weekBins), color: "#6b7280" },
          { label: "Pay This Week", value: formatCurrency(data.totals.weekEarnings), color: "#15803d" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "0.875rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {[
                  "Employee",
                  "Clock Today",
                  "Hours Today",
                  "Bins Today",
                  "Pay Today",
                  "Hours Week",
                  "Bins Week",
                  "Pay Week",
                  "",
                ].map((label) => (
                  <th
                    key={label || "actions"}
                    style={{
                      padding: "0.875rem 1rem",
                      textAlign: "left",
                      fontSize: "0.8125rem",
                      fontWeight: "700",
                      color: "#374151",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.employees.map((employee) => (
                <tr key={employee.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ fontWeight: "700", color: "#111827" }}>{employee.name}</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{employee.email}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem" }}>
                      {employee.residentialFirstBinPay != null && employee.residentialAdditionalBinPay != null
                        ? `${formatCurrency(employee.residentialFirstBinPay)} first + ${formatCurrency(employee.residentialAdditionalBinPay)} add'l`
                        : `${formatCurrency(employee.payRatePerJob)} first bin`}
                      {employee.isPartnerEmployee ? " · Partner employee" : ""}
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "#4b5563" }}>
                    {formatClockRange(
                      employee.today.clockInTime,
                      employee.today.clockOutTime,
                      employee.today.isActive
                    )}
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>
                    {formatHours(employee.today.hoursWorked)}
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ fontWeight: "600" }}>{employee.today.binsCleaned}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {employee.today.jobsEligible} paid / {employee.today.jobsCompleted} done
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "700", color: "#16a34a" }}>
                    {employee.isPartnerEmployee ? "Partner payroll" : formatCurrency(employee.today.earnings)}
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>
                    {formatHours(employee.week.hoursWorked)}
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "500" }}>
                      {employee.week.daysWorked} day{employee.week.daysWorked === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ fontWeight: "600" }}>{employee.week.binsCleaned}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {employee.week.jobsEligible} paid / {employee.week.jobsCompleted} done
                    </div>
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: "700", color: "#15803d" }}>
                    {employee.isPartnerEmployee ? "Partner payroll" : formatCurrency(employee.week.earnings)}
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <OperatorActionButton
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/operator/employees/${employee.id}`)}
                    >
                      View
                    </OperatorActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: "0.85rem", fontSize: "0.75rem", color: "#6b7280" }}>
        Pay is estimated from completed jobs with required proof photos at each employee&apos;s per-bin rate.
        Partner employees are paid through their partner account.
      </p>

      {data.operators && data.operators.length > 0 && (
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827", margin: "0 0 0.35rem" }}>
            Operator Hours & Pay
          </h3>
          <p style={{ margin: "0 0 1rem", fontSize: "0.8125rem", color: "#6b7280" }}>
            Locked to operator clock in/out records. Operators cannot edit their hours.
          </p>

          {data.operatorTotals && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {[
                { label: "Op Hours Today", value: formatHours(data.operatorTotals.todayHours), color: "#2563eb" },
                { label: "Op Pay Today", value: formatCurrency(data.operatorTotals.todayPay), color: "#16a34a" },
                { label: "Op Hours Week", value: formatHours(data.operatorTotals.weekHours), color: "#111827" },
                { label: "Op Pay Week", value: formatCurrency(data.operatorTotals.weekPay), color: "#15803d" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "0.75rem 0.875rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: "700", color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Operator", "Status", "Hours Today", "Pay Today", "Hours Week", "Pay Week", "Rate"].map(
                      (label) => (
                        <th
                          key={label}
                          style={{
                            padding: "0.875rem 1rem",
                            textAlign: "left",
                            fontSize: "0.8125rem",
                            fontWeight: "700",
                            color: "#374151",
                          }}
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.operators.map((operator) => (
                    <tr key={operator.operatorId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ fontWeight: "700", color: "#111827" }}>{operator.name}</div>
                        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{operator.email}</div>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", color: operator.isClockedIn ? "#16a34a" : "#6b7280", fontWeight: 600 }}>
                        {operator.isClockedIn ? "On Shift" : "Off Shift"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>
                        {formatHours(operator.todayHours)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: "700", color: "#16a34a" }}>
                        {operator.hourlyRate > 0 ? formatCurrency(operator.todayPay) : "—"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: "600" }}>
                        {formatHours(operator.weekHours)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: "700", color: "#15803d" }}>
                        {operator.hourlyRate > 0 ? formatCurrency(operator.weekPay) : "—"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        {operator.hourlyRate > 0 ? `${formatCurrency(operator.hourlyRate)}/hr` : "Owner sets rate"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
