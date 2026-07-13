"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FleetPayrollPanel } from "@/components/OperatorDashboard/FleetPayrollPanel";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";

const EmployeeStatus = dynamic(
  () => import("@/components/OperatorDashboard/EmployeeStatus").then((m) => m.EmployeeStatus),
  { loading: () => <div style={{ color: "#6b7280", padding: "1rem" }}>Loading fleet status...</div> }
);

const OperatorLiveMap = dynamic(
  () => import("@/components/OperatorDashboard/OperatorLiveMap").then((m) => m.OperatorLiveMap),
  { loading: () => <div style={{ color: "#6b7280", padding: "1rem" }}>Loading live map...</div> }
);

type OwnerLiveView = "command" | "map" | "fleet" | "payroll";

type FleetLiveStats = {
  totalEmployees: number;
  clockedIn: number;
  todayActiveStops: number;
  upcomingActiveStops: number;
  totalActiveStops: number;
};

type PayrollTotals = {
  todayHours: number;
  todayBins: number;
  todayEarnings: number;
  weekHours: number;
  weekBins: number;
  weekEarnings: number;
};

type CompensationRates = {
  residentialFirstBinPay: number;
  residentialAdditionalBinPay: number;
  commercialFirstContainerPay: number;
  commercialAdditionalContainerPay: number;
};

interface OwnerLiveOpsHubProps {
  userId: string;
  onOpenCompensation?: () => void;
  onOpenPayrollSettings?: () => void;
  onOpenSchedule?: () => void;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function OwnerLiveOpsHub({
  userId,
  onOpenCompensation,
  onOpenPayrollSettings,
  onOpenSchedule,
}: OwnerLiveOpsHubProps) {
  const [liveView, setLiveView] = useState<OwnerLiveView>("command");
  const [fleetStats, setFleetStats] = useState<FleetLiveStats | null>(null);
  const [payrollTotals, setPayrollTotals] = useState<PayrollTotals | null>(null);
  const [compensationRates, setCompensationRates] = useState<CompensationRates | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLiveSnapshot = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);

      const [fleetRes, payrollRes, compensationRes] = await Promise.all([
        fetch("/api/operator/fleet/live", { cache: "no-store" }),
        fetch("/api/operator/fleet/payroll", { cache: "no-store" }),
        fetch("/api/admin/compensation-settings", { cache: "no-store" }),
      ]);

      const [fleetData, payrollData, compensationData] = await Promise.all([
        fleetRes.json().catch(() => ({})),
        payrollRes.json().catch(() => ({})),
        compensationRes.json().catch(() => ({})),
      ]);

      if (!fleetRes.ok) {
        throw new Error(fleetData.error || "Failed to load fleet map data");
      }
      if (!payrollRes.ok) {
        throw new Error(payrollData.error || "Failed to load payroll totals");
      }

      setFleetStats(fleetData.stats || null);
      setPayrollTotals(payrollData.totals || null);

      if (compensationRes.ok && compensationData.settings) {
        setCompensationRates({
          residentialFirstBinPay: compensationData.settings.residentialFirstBinPay,
          residentialAdditionalBinPay: compensationData.settings.residentialAdditionalBinPay,
          commercialFirstContainerPay: compensationData.settings.commercialFirstContainerPay,
          commercialAdditionalContainerPay: compensationData.settings.commercialAdditionalContainerPay,
        });
      }

      setError(null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to sync live data");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLiveSnapshot();
    const interval = window.setInterval(() => loadLiveSnapshot(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadLiveSnapshot]);

  const statCards = useMemo(
    () => [
      {
        label: "On Shift Now",
        value: fleetStats ? String(fleetStats.clockedIn) : "—",
        color: "#2563eb",
      },
      {
        label: "Today's Stops",
        value: fleetStats ? String(fleetStats.todayActiveStops) : "—",
        color: "#7c3aed",
      },
      {
        label: "Bins Today",
        value: payrollTotals ? String(payrollTotals.todayBins) : "—",
        color: "#111827",
      },
      {
        label: "Pay Today",
        value: payrollTotals ? formatCurrency(payrollTotals.todayEarnings) : "—",
        color: "#16a34a",
      },
      {
        label: "Pay This Week",
        value: payrollTotals ? formatCurrency(payrollTotals.weekEarnings) : "—",
        color: "#15803d",
      },
    ],
    [fleetStats, payrollTotals]
  );

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
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#111827" }}>
            Live Command Center
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Real-time fleet map, employee pay, hours, and operations — synced every 30 seconds.
          </p>
          {lastSync && (
            <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#9ca3af" }}>
              Last synced {lastSync.toLocaleTimeString()}
              {refreshing ? " · Refreshing..." : ""}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <OperatorActionButton variant="neutral" size="sm" onClick={() => loadLiveSnapshot(true)}>
            {refreshing ? "Syncing..." : "Sync Now"}
          </OperatorActionButton>
          {onOpenSchedule && (
            <OperatorActionButton variant="neutral" size="sm" onClick={onOpenSchedule}>
              Schedule Board
            </OperatorActionButton>
          )}
          {onOpenCompensation && (
            <OperatorActionButton variant="neutral" size="sm" onClick={onOpenCompensation}>
              Compensation Settings
            </OperatorActionButton>
          )}
          {onOpenPayrollSettings && (
            <OperatorActionButton variant="primary" size="sm" onClick={onOpenPayrollSettings}>
              Payroll Summary
            </OperatorActionButton>
          )}
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
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {compensationRates && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            fontSize: "0.8125rem",
            color: "#166534",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            <strong>Residential:</strong> {formatCurrency(compensationRates.residentialFirstBinPay)} first bin +{" "}
            {formatCurrency(compensationRates.residentialAdditionalBinPay)} each additional
          </span>
          <span>
            <strong>Commercial/HOA:</strong> {formatCurrency(compensationRates.commercialFirstContainerPay)} first
            container + {formatCurrency(compensationRates.commercialAdditionalContainerPay)} each additional
          </span>
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
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "0.875rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{card.label}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "0.5rem",
        }}
      >
        {[
          { id: "command" as OwnerLiveView, label: "Command Overview" },
          { id: "map" as OwnerLiveView, label: "Live Map" },
          { id: "fleet" as OwnerLiveView, label: "Fleet & Team" },
          { id: "payroll" as OwnerLiveView, label: "Hours & Pay" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLiveView(tab.id)}
            style={{
              padding: "0.5rem 0.875rem",
              border: "none",
              borderRadius: "8px",
              background: liveView === tab.id ? "#111827" : "#f3f4f6",
              color: liveView === tab.id ? "#ffffff" : "#374151",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {liveView === "command" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <OperatorLiveMap operatorId={userId} />
          <EmployeeStatus userId={userId} />
        </div>
      )}

      {liveView === "map" && <OperatorLiveMap operatorId={userId} />}

      {liveView === "fleet" && <EmployeeStatus userId={userId} />}

      {liveView === "payroll" && <FleetPayrollPanel />}
    </div>
  );
}
