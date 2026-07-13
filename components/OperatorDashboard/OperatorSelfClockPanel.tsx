"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";
import { formatClockRange, formatCurrency, formatHours } from "@/lib/operator-fleet-payroll";

type OperatorListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
};

type OperatorTimecard = {
  operatorId: string;
  name: string;
  email: string;
  hourlyRate: number;
  isClockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  todayHours: number;
  todayPay: number;
  weekHours: number;
  weekPay: number;
  daysWorkedThisWeek: number;
  hoursLocked: true;
  payLocked: true;
};

interface OperatorSelfClockPanelProps {
  operatorId: string;
  operatorName?: string;
}

export function OperatorSelfClockPanel({ operatorId, operatorName }: OperatorSelfClockPanelProps) {
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState(operatorId);
  const [timecard, setTimecard] = useState<OperatorTimecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const isSelfSelected = selectedOperatorId === operatorId;
  const selectedOperator = useMemo(
    () => operators.find((operator) => operator.id === selectedOperatorId) || null,
    [operators, selectedOperatorId]
  );

  const loadTimecard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/operator/self/timecard?operatorId=${encodeURIComponent(selectedOperatorId)}`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load operator timecard");
      }

      setOperators(data.operators || []);
      setTimecard(data.timecard || null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load timecard");
    } finally {
      setLoading(false);
    }
  }, [selectedOperatorId]);

  useEffect(() => {
    setSelectedOperatorId(operatorId);
  }, [operatorId]);

  useEffect(() => {
    loadTimecard();
    const interval = window.setInterval(() => loadTimecard(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadTimecard]);

  async function handleClockIn() {
    if (!isSelfSelected) return;
    setWorking("in");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/operator/self/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to clock in");
      }
      setTimecard(data.timecard || null);
      setMessage("You are clocked in");
    } catch (clockInError: unknown) {
      setError(clockInError instanceof Error ? clockInError.message : "Failed to clock in");
    } finally {
      setWorking(null);
    }
  }

  async function handleClockOut() {
    if (!isSelfSelected) return;
    setWorking("out");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/operator/self/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to clock out");
      }
      setTimecard(data.timecard || null);
      setMessage(`Clocked out · ${formatHours(data.hoursWorked || 0)} worked`);
    } catch (clockOutError: unknown) {
      setError(clockOutError instanceof Error ? clockOutError.message : "Failed to clock out");
    } finally {
      setWorking(null);
    }
  }

  const displayName =
    timecard?.name ||
    selectedOperator?.fullName ||
    operatorName ||
    "Operator";

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f1f5f9",
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>
              My Shift — Clock In / Out
            </h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
              Select your name, then clock in or out. Hours and pay are locked to your clock records — you cannot edit them.
            </p>
            {lastSync && (
              <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                Updated {lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.7rem",
              borderRadius: "999px",
              background: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              fontSize: "0.75rem",
              fontWeight: "600",
            }}
          >
            🔒 Hours locked
          </div>
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem" }}>
        {loading && !timecard ? (
          <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading your shift...</div>
        ) : (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                  letterSpacing: "0.04em",
                }}
              >
                SELECT YOUR NAME
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {operators.length === 0 ? (
                  <div
                    style={{
                      padding: "0.875rem 1rem",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    {displayName} (You)
                  </div>
                ) : (
                  operators.map((operator) => {
                    const isYou = operator.id === operatorId;
                    const isSelected = operator.id === selectedOperatorId;
                    return (
                      <button
                        key={operator.id}
                        type="button"
                        onClick={() => setSelectedOperatorId(operator.id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.875rem 1rem",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid #16a34a" : "1px solid #e5e7eb",
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "700", color: "#111827", fontSize: "0.9rem" }}>
                            {operator.fullName}
                            {isYou ? (
                              <span style={{ marginLeft: "0.5rem", color: "#16a34a", fontSize: "0.75rem" }}>
                                (You)
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{operator.email}</div>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#16a34a" }}>Selected</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {!isSelfSelected && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.875rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "10px",
                  color: "#92400e",
                  fontSize: "0.8125rem",
                }}
              >
                Sign in as this operator to clock yourself in or out. You can view their locked hours, but only your
                account can start or end a shift.
              </div>
            )}

            {timecard && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                {[
                  {
                    label: "Status",
                    value: timecard.isClockedIn ? "On Shift" : "Off Shift",
                    color: timecard.isClockedIn ? "#16a34a" : "#6b7280",
                  },
                  {
                    label: "Hours Today",
                    value: formatHours(timecard.todayHours),
                    color: "#2563eb",
                  },
                  {
                    label: "Pay Today",
                    value:
                      timecard.hourlyRate > 0
                        ? formatCurrency(timecard.todayPay)
                        : "Rate pending",
                    color: "#15803d",
                  },
                  {
                    label: "Hours This Week",
                    value: formatHours(timecard.weekHours),
                    color: "#111827",
                  },
                  {
                    label: "Pay This Week",
                    value:
                      timecard.hourlyRate > 0
                        ? formatCurrency(timecard.weekPay)
                        : "Rate pending",
                    color: "#15803d",
                  },
                  {
                    label: "Hourly Rate",
                    value: timecard.hourlyRate > 0 ? formatCurrency(timecard.hourlyRate) : "Set by owner",
                    color: "#7c3aed",
                  },
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

            {timecard && (
              <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "1rem" }}>
                Clock today:{" "}
                <strong style={{ color: "#374151" }}>
                  {formatClockRange(timecard.clockInTime, timecard.clockOutTime, timecard.isClockedIn)}
                </strong>
                {timecard.hourlyRate > 0 ? (
                  <>
                    {" "}
                    · Pay calculated at {formatCurrency(timecard.hourlyRate)}/hr (locked)
                  </>
                ) : (
                  <> · Owner must set operator hourly rate in compensation settings</>
                )}
              </div>
            )}

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

            {message && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.875rem 1rem",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  color: "#166534",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {message}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {timecard?.isClockedIn ? (
                <OperatorActionButton
                  variant="danger"
                  disabled={!isSelfSelected || working !== null}
                  onClick={handleClockOut}
                >
                  {working === "out" ? "Clocking Out..." : "Clock Out"}
                </OperatorActionButton>
              ) : (
                <OperatorActionButton
                  variant="success"
                  disabled={!isSelfSelected || working !== null}
                  onClick={handleClockIn}
                >
                  {working === "in" ? "Clocking In..." : "Clock In"}
                </OperatorActionButton>
              )}
              <OperatorActionButton variant="neutral" onClick={() => loadTimecard(true)}>
                Refresh
              </OperatorActionButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
