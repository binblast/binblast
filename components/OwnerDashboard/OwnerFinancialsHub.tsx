"use client";

import { PayrollSummary } from "@/components/OwnerDashboard/PayrollSummary";
import { FinancialAnalytics } from "@/components/OwnerDashboard/FinancialAnalytics";
import { ProfitFirstHub } from "@/components/OwnerDashboard/ProfitFirstHub";

interface OwnerFinancialsHubProps {
  userId: string;
  onOpenCompensation?: () => void;
}

export function OwnerFinancialsHub({ userId, onOpenCompensation }: OwnerFinancialsHubProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#111827" }}>
              Employee Payroll
            </h2>
            <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Live employee pay from completed jobs, tied to contribution profit and margin targets.
            </p>
          </div>
          {onOpenCompensation && (
            <button
              type="button"
              onClick={onOpenCompensation}
              style={{
                padding: "0.5rem 0.875rem",
                background: "#111827",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Edit Compensation Settings
            </button>
          )}
        </div>
        <PayrollSummary />
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "2rem" }}>
        <ProfitFirstHub />
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: "0 0 1rem", color: "#111827" }}>
          Revenue & Profit Analytics
        </h2>
        <FinancialAnalytics userId={userId} />
      </div>
    </div>
  );
}
