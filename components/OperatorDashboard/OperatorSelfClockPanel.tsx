"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";
import { formatHours } from "@/lib/operator-fleet-payroll";

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

const cardStyle = {
  marginBottom: "1.5rem",
  background: "#ffffff",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
  overflow: "hidden" as const,
};

export function OperatorSelfClockPanel({ operatorId, operatorName }: OperatorSelfClockPanelProps) {
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState(operatorId);
  const [timecard, setTimecard] = useState<OperatorTimecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastShiftHours, setLastShiftHours] = useState<number | null>(null);

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
    if (!lastShiftHours) return;
    const timer = window.setTimeout(() => setLastShiftHours(null), 8000);
    return () => window.clearTimeout(timer);
  }, [lastShiftHours]);

  async function handleClockIn() {
    if (!isSelfSelected) return;
    setWorking("in");
    setError(null);
    setLastShiftHours(null);

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
      setLastShiftHours(data.hoursWorked || 0);
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
      <div style={{ ...cardStyle, padding: "1rem 1.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
        Loading shift...
      </div>
    );
  }

  if (isOnShift && timecard) {
    return (
      <div
        style={{
          ...cardStyle,
          border: "1px solid #bbf7d0",
          boxShadow: "0 2px 12px rgba(22, 163, 74, 0.1)",
        }}
      >
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#16a34a",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "1rem", fontWeight: "700", color: "#16a34a" }}>On Shift</span>
            </div>
            <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>{displayName}</span>
          </div>

          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#6b7280",
                letterSpacing: "0.04em",
                marginBottom: "0.25rem",
              }}
            >
              HOURS TODAY
            </div>
            <div style={{ fontSize: "clamp(2rem, 8vw, 2.5rem)", fontWeight: "800", color: "#111827", lineHeight: 1.1 }}>
              {formatHours(timecard.todayHours)}
            </div>
          </div>

          <OperatorActionButton
            variant="danger"
            fullWidth
            disabled={working !== null}
            onClick={handleClockOut}
          >
            {working === "out" ? "Clocking Out..." : "Clock Out"}
          </OperatorActionButton>

          {error && (
            <p style={{ margin: "0.75rem 0 0", color: "#dc2626", fontSize: "0.8125rem", textAlign: "center" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ padding: "1.25rem 1.5rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>
          Clock In
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
          Pick your name and tap Clock In.
        </p>

        <label
          htmlFor="operator-shift-select"
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "#6b7280",
            marginBottom: "0.4rem",
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
            fontSize: "1rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "0.75rem",
            cursor: "pointer",
            minHeight: "44px",
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
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.45 }}>
            Switch to your account to clock in.
          </p>
        )}

        {lastShiftHours !== null && (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#166534", fontWeight: "600", textAlign: "center" }}>
            Shift complete · {formatHours(lastShiftHours)} worked
          </p>
        )}

        {timecard && timecard.todayHours > 0 && lastShiftHours === null && (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#6b7280", textAlign: "center" }}>
            Today so far: {formatHours(timecard.todayHours)}
          </p>
        )}

        {error && (
          <p style={{ margin: "0 0 0.75rem", color: "#dc2626", fontSize: "0.8125rem", textAlign: "center" }}>
            {error}
          </p>
        )}

        <OperatorActionButton
          variant="success"
          fullWidth
          disabled={!isSelfSelected || working !== null}
          onClick={handleClockIn}
        >
          {working === "in" ? "Clocking In..." : "Clock In"}
        </OperatorActionButton>
      </div>
    </div>
  );
}
