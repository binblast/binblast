"use client";

import { MARGIN_STATUS_LABELS } from "@/lib/profit-first-settings";

type PlainLanguage = {
  customerPays: string;
  employeeEarns: string;
  partnerEarns: string;
  otherDirectCosts: string;
  binBlastKeeps: string;
  contributionMargin: string;
  approvalStatus: string;
};

interface JobEconomicsSummaryProps {
  plainLanguage: PlainLanguage;
  marginStatus?: keyof typeof MARGIN_STATUS_LABELS;
  approvalRequired?: boolean;
  compact?: boolean;
}

function cardStyle(status?: string) {
  if (status === "unprofitable" || status === "owner_approval_required") {
    return { borderColor: "#fecaca", background: "#fff7f7" };
  }
  if (status === "low_margin") {
    return { borderColor: "#fde68a", background: "#fffbeb" };
  }
  return { borderColor: "#e5e7eb", background: "#ffffff" };
}

export function JobEconomicsSummary({
  plainLanguage,
  marginStatus,
  approvalRequired,
  compact = false,
}: JobEconomicsSummaryProps) {
  const style = cardStyle(marginStatus);

  if (compact) {
    return (
      <div
        style={{
          ...style,
          border: "1px solid",
          borderRadius: "8px",
          padding: "0.625rem 0.75rem",
          fontSize: "0.8125rem",
          lineHeight: 1.45,
        }}
      >
        <strong>Bin Blast keeps {plainLanguage.binBlastKeeps}</strong>
        {" · "}
        Margin {plainLanguage.contributionMargin}
        {marginStatus && (
          <>
            {" · "}
            {MARGIN_STATUS_LABELS[marginStatus]}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        border: "1px solid",
        borderRadius: "12px",
        padding: "1rem 1.125rem",
      }}
    >
      <div
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "#374151",
          marginBottom: "0.625rem",
        }}
      >
        Job Profit Summary
      </div>
      <div style={{ display: "grid", gap: "0.3rem", fontSize: "0.9375rem" }}>
        <div>
          <strong>Customer pays:</strong> {plainLanguage.customerPays}
        </div>
        <div>
          <strong>Employee earns:</strong> {plainLanguage.employeeEarns}
        </div>
        <div>
          <strong>Partner earns:</strong> {plainLanguage.partnerEarns}
        </div>
        <div>
          <strong>Other direct costs:</strong> {plainLanguage.otherDirectCosts}
        </div>
        <div>
          <strong>Bin Blast keeps:</strong> {plainLanguage.binBlastKeeps}
        </div>
        <div>
          <strong>Contribution margin:</strong> {plainLanguage.contributionMargin}
        </div>
        <div>
          <strong>Approval status:</strong>{" "}
          {approvalRequired ? plainLanguage.approvalStatus : plainLanguage.approvalStatus}
        </div>
      </div>
    </div>
  );
}
