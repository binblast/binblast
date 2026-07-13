"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatHours } from "@/lib/operator-fleet-payroll";

type PayrollRow = {
  employeeId: string;
  employeeName: string;
  email: string;
  isPartnerEmployee: boolean;
  jobsCompleted: number;
  binsCleaned: number;
  grossEarnings: number;
  bonuses: number;
  adjustments: number;
  finalPay: number;
  paymentStatus: string;
  avgPerJob: number;
  avgPerBin: number;
};

type OperatorPayrollRow = {
  operatorId: string;
  operatorName: string;
  email: string;
  hourlyRate: number;
  hoursWorked: number;
  daysWorked: number;
  grossPay: number;
  paymentStatus: string;
};

type PayrollSummaryResponse = {
  payPeriod: { startDate: string; endDate: string };
  totals: {
    jobsCompleted: number;
    binsCleaned: number;
    grossEarnings: number;
    finalPay: number;
  };
  employees: PayrollRow[];
  operatorPayroll?: {
    payPeriod: { startDate: string; endDate: string };
    hourlyRate: number;
    totals: {
      hoursWorked: number;
      grossPay: number;
      daysWorked: number;
    };
    operators: OperatorPayrollRow[];
  };
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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

export function PayrollSummary() {
  const [data, setData] = useState<PayrollSummaryResponse | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/admin/payroll-summary?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load payroll summary");
      }

      setData(payload);
      if (!startDate) setStartDate(payload.payPeriod.startDate);
      if (!endDate) setEndDate(payload.payPeriod.endDate);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payroll summary");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    loadSummary();
  }, []);

  const periodLabel = useMemo(() => {
    if (!data) return "";
    return formatPeriodLabel(data.payPeriod.startDate, data.payPeriod.endDate);
  }, [data]);

  function exportCsv() {
    if (!data) return;

    const rows: string[][] = [
      ["Field Employee Payroll"],
      [
        "Employee",
        "Email",
        "Jobs Completed",
        "Bins Cleaned",
        "Gross Earnings",
        "Bonuses",
        "Adjustments",
        "Final Pay",
        "Payment Status",
        "Avg Per Job",
        "Avg Per Bin",
      ],
      ...data.employees.map((row) => [
        row.employeeName,
        row.email,
        String(row.jobsCompleted),
        String(row.binsCleaned),
        row.grossEarnings.toFixed(2),
        row.bonuses.toFixed(2),
        row.adjustments.toFixed(2),
        row.finalPay.toFixed(2),
        row.paymentStatus,
        row.avgPerJob.toFixed(2),
        row.avgPerBin.toFixed(2),
      ]),
    ];

    if (data.operatorPayroll && data.operatorPayroll.operators.length > 0) {
      rows.push([]);
      rows.push(["Operator Hours & Pay"]);
      rows.push([
        "Operator",
        "Email",
        "Hours Worked",
        "Days Worked",
        "Hourly Rate",
        "Gross Pay",
        "Payment Status",
      ]);
      rows.push(
        ...data.operatorPayroll.operators.map((row) => [
          row.operatorName,
          row.email,
          formatHours(row.hoursWorked),
          String(row.daysWorked),
          row.hourlyRate.toFixed(2),
          row.grossPay.toFixed(2),
          row.paymentStatus,
        ])
      );
    }

    downloadCsv(`payroll-summary-${data.payPeriod.startDate}-${data.payPeriod.endDate}.csv`, rows);
  }

  function exportOperatorCsv() {
    if (!data?.operatorPayroll) return;

    const rows: string[][] = [
      [
        "Operator",
        "Email",
        "Hours Worked",
        "Days Worked",
        "Hourly Rate",
        "Gross Pay",
        "Payment Status",
        "Pay Period Start",
        "Pay Period End",
      ],
      ...data.operatorPayroll.operators.map((row) => [
        row.operatorName,
        row.email,
        formatHours(row.hoursWorked),
        String(row.daysWorked),
        row.hourlyRate.toFixed(2),
        row.grossPay.toFixed(2),
        row.paymentStatus,
        data.payPeriod.startDate,
        data.payPeriod.endDate,
      ]),
    ];

    downloadCsv(
      `operator-payroll-${data.payPeriod.startDate}-${data.payPeriod.endDate}.csv`,
      rows
    );
  }

  function exportPdf() {
    window.print();
  }

  if (loading && !data) {
    return <div style={{ color: "#6b7280" }}>Loading payroll summary...</div>;
  }

  return (
    <div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        Payroll Summary
      </h3>
      <p style={{ color: "#6b7280", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Employee gross pay from completed jobs and operator pay from locked clock in/out records.
        Use date filters to track any pay period over time. All clock records are saved permanently in
        the system.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="action-button-row"
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px" }}
          />
        </div>
        <button
          type="button"
          onClick={loadSummary}
          style={{
            padding: "0.5rem 1rem",
            background: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Apply Filter
        </button>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            padding: "0.5rem 1rem",
            background: "#ffffff",
            color: "#111827",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={exportPdf}
          style={{
            padding: "0.5rem 1rem",
            background: "#ffffff",
            color: "#111827",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
        {data?.operatorPayroll && data.operatorPayroll.operators.length > 0 && (
          <button
            type="button"
            onClick={exportOperatorCsv}
            style={{
              padding: "0.5rem 1rem",
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Export Operator CSV
          </button>
        )}
      </div>

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              { label: "Pay Period", value: periodLabel },
              { label: "Jobs Completed", value: String(data.totals.jobsCompleted) },
              { label: "Bins Cleaned", value: String(data.totals.binsCleaned) },
              { label: "Gross Earnings", value: formatCurrency(data.totals.grossEarnings) },
              { label: "Final Pay", value: formatCurrency(data.totals.finalPay) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                  {[
                    "Employee",
                    "Jobs",
                    "Bins",
                    "Gross",
                    "Bonuses",
                    "Adjustments",
                    "Final Pay",
                    "Status",
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: "0.75rem",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.employees.map((row) => (
                  <tr key={row.employeeId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: "600" }}>{row.employeeName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.email}</div>
                    </td>
                    <td style={{ padding: "0.75rem" }}>{row.jobsCompleted}</td>
                    <td style={{ padding: "0.75rem" }}>{row.binsCleaned}</td>
                    <td style={{ padding: "0.75rem", fontWeight: "600", color: "#047857" }}>
                      {formatCurrency(row.grossEarnings)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.bonuses)}</td>
                    <td style={{ padding: "0.75rem" }}>{formatCurrency(row.adjustments)}</td>
                    <td style={{ padding: "0.75rem", fontWeight: "700" }}>
                      {formatCurrency(row.finalPay)}
                    </td>
                    <td style={{ padding: "0.75rem", textTransform: "capitalize" }}>{row.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.operatorPayroll && (
            <div style={{ marginTop: "2.5rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
              <h4 style={{ fontSize: "1.05rem", fontWeight: "700", margin: "0 0 0.35rem", color: "#111827" }}>
                Operator Hours & Pay
              </h4>
              <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.5 }}>
                Calculated from operator clock in/out records at{" "}
                {data.operatorPayroll.hourlyRate > 0
                  ? formatCurrency(data.operatorPayroll.hourlyRate)
                  : "owner-set rate (not configured)"}
                /hr. Hours cannot be edited by operators.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "1.25rem",
                }}
              >
                {[
                  { label: "Operator Hours", value: formatHours(data.operatorPayroll.totals.hoursWorked) },
                  { label: "Operator Gross Pay", value: formatCurrency(data.operatorPayroll.totals.grossPay) },
                  { label: "Days Worked", value: String(data.operatorPayroll.totals.daysWorked) },
                  {
                    label: "Hourly Rate",
                    value:
                      data.operatorPayroll.hourlyRate > 0
                        ? `${formatCurrency(data.operatorPayroll.hourlyRate)}/hr`
                        : "Not set",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "1rem",
                      background: "#f0fdf4",
                      borderRadius: "8px",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {data.operatorPayroll.operators.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  No operator clock records for this pay period.
                </p>
              ) : (
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ background: "#f0fdf4", textAlign: "left" }}>
                        {["Operator", "Hours", "Days", "Rate", "Gross Pay", "Status"].map((header) => (
                          <th
                            key={header}
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #bbf7d0",
                              fontWeight: "600",
                              color: "#374151",
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.operatorPayroll.operators.map((row) => (
                        <tr key={row.operatorId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ fontWeight: "600" }}>{row.operatorName}</div>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.email}</div>
                          </td>
                          <td style={{ padding: "0.75rem", fontWeight: "600" }}>
                            {formatHours(row.hoursWorked)}
                          </td>
                          <td style={{ padding: "0.75rem" }}>{row.daysWorked}</td>
                          <td style={{ padding: "0.75rem" }}>
                            {row.hourlyRate > 0 ? `${formatCurrency(row.hourlyRate)}/hr` : "—"}
                          </td>
                          <td style={{ padding: "0.75rem", fontWeight: "700", color: "#15803d" }}>
                            {row.hourlyRate > 0 ? formatCurrency(row.grossPay) : "—"}
                          </td>
                          <td style={{ padding: "0.75rem", textTransform: "capitalize" }}>
                            {row.paymentStatus}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
