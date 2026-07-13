"use client";

import { useCallback, useEffect, useState } from "react";

type EarningsResponse = {
  today: { jobs: number; bins: number; earnings: number };
  week: { jobs: number; bins: number; earnings: number };
  month: { jobs: number; bins: number; earnings: number };
  lifetime: {
    jobs: number;
    bins: number;
    earnings: number;
    avgPerJob: number;
    avgPerBin: number;
  };
  recentPayments: Array<{
    id: string;
    jobId: string | null;
    amount: number;
    bins: number;
    category: string;
    scheduledDate: string | null;
    createdAt: string | null;
    status: string;
  }>;
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

interface EmployeeEarningsPanelProps {
  employeeId: string;
}

export function EmployeeEarningsPanel({ employeeId }: EmployeeEarningsPanelProps) {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/employee/earnings?employeeId=${employeeId}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load earnings");
      }
      setData(payload);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  if (loading) {
    return (
      <div style={{ padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
        Loading earnings...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "1rem", color: "#b91c1c", fontSize: "0.875rem" }}>
        {error || "Earnings unavailable"}
      </div>
    );
  }

  const stats = [
    { label: "Today's Jobs", value: String(data.today.jobs) },
    { label: "Today's Bins", value: String(data.today.bins) },
    { label: "Today's Earnings", value: formatCurrency(data.today.earnings) },
    { label: "Weekly Earnings", value: formatCurrency(data.week.earnings) },
    { label: "Monthly Earnings", value: formatCurrency(data.month.earnings) },
    { label: "Lifetime Earnings", value: formatCurrency(data.lifetime.earnings) },
    { label: "Completed Jobs", value: String(data.lifetime.jobs) },
    { label: "Avg / Job", value: formatCurrency(data.lifetime.avgPerJob) },
    { label: "Avg / Bin", value: formatCurrency(data.lifetime.avgPerBin) },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "clamp(1rem, 4vw, 1.5rem)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
          Earnings
        </h2>
        <button
          type="button"
          onClick={loadEarnings}
          style={{
            padding: "0.375rem 0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            fontSize: "0.75rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "0.875rem",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
              {stat.label}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "700", color: "#111827" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {data.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "0.75rem" }}>
            Recent Payment History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.recentPayments.slice(0, 8).map((payment) => (
              <div
                key={payment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.625rem 0.75rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: "600" }}>
                    {payment.bins} bin{payment.bins === 1 ? "" : "s"} · {payment.category}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                    {payment.scheduledDate || "—"}
                  </div>
                </div>
                <div style={{ fontWeight: "700", color: "#047857" }}>
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
