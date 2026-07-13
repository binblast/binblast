"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";
import { formatClockRange, formatHours } from "@/lib/operator-fleet-payroll";

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

  const isSelfSelected = selectedOperatorId === operatorId;
  const isOnShift = Boolean(timecard?.isClockedIn && isSelfSelected);

  const selectedOperator = useMemo(
    () => operators.find((operator) => operator.id === selectedOperatorId) || null,
    [operators, selectedOperatorId]
  );

  const loadTimecard = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);

        const targetId = isOnShift ? operatorId : selectedOperatorId;
        const response = await fetch(
          `/api/operator/self/timecard?operatorId=${encodeURIComponent(targetId)}`,
          { cache: "no-store" }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load operator timecard");
        }

        setOperators(data.operators || []);
        setTimecard(data.timecard || null);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load timecard");
      } finally {
        setLoading(false);
      }
    },
    [isOnShift, operatorId, selectedOperatorId]
  );

  useEffect(() => {
    setSelectedOperatorId(operatorId);
  }, [operatorId]);

  useEffect(() => {
    loadTimecard();
    const interval = window.setInterval(() => loadTimecard(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadTimecard]);

  useEffect(() => {
    if (timecard?.isClockedIn && isSelfSelected) {
      setMessage(null);
    }
  }, [timecard?.isClockedIn, isSelfSelected]);

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
      setSelectedOperatorId(operatorId);
      setTimecard(data.timecard || null);
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
    timecard?.name || selectedOperator?.fullName || operatorName || "Operator";

  if (loading && !timecard) {
    return (
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          color: "#6b7280",
          fontSize: "0.875rem",
        }}
      >
        Loading your shift...
      </div>
    );
  }

  if (isOnShift && timecard) {
    return (
      <div
        style={{
          marginBottom: "1.5rem",
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #bbf7d0",
          boxShadow: "0 2px 8px rgba(22, 163, 74, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#6b7280", letterSpacing: "0.04em" }}>
                STATUS
              </div>
              <div style={{ fontSize: "1rem", fontWeight: "700", color: "#16a34a" }}>On Shift</div>
            </div>
            <div style={{ width: "1px", height: "36px", background: "#e5e7eb" }} />
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#6b7280", letterSpacing: "0.04em" }}>
                HOURS TODAY
              </div>
              <div style={{ fontSize: "1rem", fontWeight: "700", color: "#2563eb" }}>
                {formatHours(timecard.todayHours)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <OperatorActionButton
              variant="danger"
              disabled={working !== null}
              onClick={handleClockOut}
            >
              {working === "out" ? "Clocking Out..." : "Clock Out"}
            </OperatorActionButton>
            <OperatorActionButton variant="neutral" size="sm" onClick={() => loadTimecard(true)}>
              Refresh
            </OperatorActionButton>
          </div>
        </div>

        <details
          style={{
            borderTop: "1px solid #f0fdf4",
            background: "#f9fafb",
          }}
        >
          <summary
            style={{
              padding: "0.55rem 1.25rem",
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#6b7280",
              cursor: "pointer",
              listStyle: "none",
              userSelect: "none",
            }}
          >
            Shift details ▾
          </summary>
          <div style={{ padding: "0 1.25rem 0.875rem", fontSize: "0.8125rem", color: "#6b7280" }}>
            {displayName} ·{" "}
            {formatClockRange(timecard.clockInTime, timecard.clockOutTime, timecard.isClockedIn)}
          </div>
        </details>

        {error && (
          <div
            style={{
              margin: "0 1.25rem 1rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "0.8125rem",
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

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
      <div style={{ padding: "1.25rem 1.5rem" }}>
        <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
          Clock In
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Select your name and clock in to start your shift.
        </p>

        <label
          htmlFor="operator-shift-select"
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "#6b7280",
            marginBottom: "0.5rem",
            letterSpacing: "0.04em",
          }}
        >
          YOUR NAME
        </label>
        <select
          id="operator-shift-select"
          value={selectedOperatorId}
          onChange={(event) => setSelectedOperatorId(event.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 0.875rem",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "1rem",
            cursor: "pointer",
          }}
        >
          {operators.length === 0 ? (
            <option value={operatorId}>{displayName} (You)</option>
          ) : (
            operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.fullName}
                {operator.id === operatorId ? " (You)" : ""}
              </option>
            ))
          )}
        </select>

        {!isSelfSelected && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              color: "#92400e",
              fontSize: "0.8125rem",
            }}
          >
            Sign in as this operator to clock in. Only your account can start a shift.
          </div>
        )}

        {timecard && !timecard.isClockedIn && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#6b7280" }}>STATUS</div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#6b7280" }}>Off Shift</div>
            </div>
            {timecard.todayHours > 0 && (
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#6b7280" }}>HOURS TODAY</div>
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#2563eb" }}>
                  {formatHours(timecard.todayHours)}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
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
              padding: "0.75rem 1rem",
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

        <OperatorActionButton
          variant="success"
          disabled={!isSelfSelected || working !== null}
          onClick={handleClockIn}
        >
          {working === "in" ? "Clocking In..." : "Clock In"}
        </OperatorActionButton>
      </div>
    </div>
  );
}
