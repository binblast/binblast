"use client";

import { useEffect, useMemo, useState } from "react";
import { MARGIN_STATUS_LABELS } from "@/lib/profit-first-settings";
import { JobEconomicsSummary } from "@/components/OwnerDashboard/JobEconomicsSummary";

type EconomicsResponse = {
  plainLanguage: {
    customerPays: string;
    employeeEarns: string;
    partnerEarns: string;
    otherDirectCosts: string;
    binBlastKeeps: string;
    contributionMargin: string;
    approvalStatus: string;
  };
  marginStatus: keyof typeof MARGIN_STATUS_LABELS;
  approvalRequired: boolean;
  contributionProfitCents: number;
  contributionMarginPercent: number;
};

function cardStyle(status?: string) {
  const base = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.25rem",
  } as const;

  if (status === "unprofitable" || status === "owner_approval_required") {
    return { ...base, borderColor: "#fecaca", background: "#fff7f7" };
  }

  if (status === "low_margin") {
    return { ...base, borderColor: "#fde68a", background: "#fffbeb" };
  }

  return base;
}

export function ProfitFirstHub() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [economics, setEconomics] = useState<EconomicsResponse | null>(null);
  const [pricingFloor, setPricingFloor] = useState<any>(null);
  const [routeEconomics, setRouteEconomics] = useState<any>(null);

  const [jobForm, setJobForm] = useState({
    category: "residential",
    customerPayment: 35,
    bins: 1,
    partnerModel: "none",
    invoiceLabor: 125,
    difficultyBonus: 0,
  });

  const [floorForm, setFloorForm] = useState({
    category: "residential",
    estimatedDirectCost: 13,
  });

  const [routeForm, setRouteForm] = useState({
    stops: 5,
    routeHours: 4,
    customerPayment: 35,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/profit-settings");
        const data = await response.json();
        if (response.ok) {
          setSettings(data.settings);
        }
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const previewInput = useMemo(
    () => ({
      category: jobForm.category,
      bins: Number(jobForm.bins),
      customerPaymentCents: Math.round(Number(jobForm.customerPayment) * 100),
      invoiceLaborCents: Math.round(Number(jobForm.invoiceLabor) * 100),
      partnerModel: jobForm.partnerModel,
      paymentCollected: true,
      jobCompleted: true,
      completionDocsSubmitted: true,
      firstServiceCompleted: true,
      paymentCleared: true,
      refundHoldPassed: true,
      otherDirectCostCents: 500,
      difficultyAdjustments:
        Number(jobForm.difficultyBonus) > 0
          ? [
              {
                type: "additional_labor",
                amountCents: Math.round(Number(jobForm.difficultyBonus) * 100),
                reason: "Approved difficulty pay",
              },
            ]
          : [],
    }),
    [jobForm]
  );

  async function runJobPreview() {
    setMessage(null);
    const response = await fetch("/api/admin/job-economics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: previewInput }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Failed to calculate job economics");
      return;
    }
    setEconomics(data.economics);
  }

  async function runPricingFloor() {
    setMessage(null);
    const response = await fetch("/api/admin/pricing-floor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: floorForm.category,
        estimatedDirectCostCents: Math.round(Number(floorForm.estimatedDirectCost) * 100),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Failed to calculate pricing floor");
      return;
    }
    setPricingFloor(data.pricingFloor);
  }

  async function runRouteEconomics() {
    setMessage(null);
    const stopCount = Math.max(1, Number(routeForm.stops));
    const customerPaymentCents = Math.round(Number(routeForm.customerPayment) * 100);
    const stops = Array.from({ length: stopCount }, () => ({
      job: {
        category: "residential",
        bins: 1,
        customerPaymentCents,
        partnerModel: "none",
        paymentCollected: true,
        jobCompleted: true,
        completionDocsSubmitted: true,
        firstServiceCompleted: true,
        paymentCleared: true,
        refundHoldPassed: true,
        otherDirectCostCents: 500,
      },
    }));

    const response = await fetch("/api/admin/route-economics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          stops,
          routeHours: Number(routeForm.routeHours),
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Failed to calculate route economics");
      return;
    }
    setRouteEconomics(data.routeEconomics);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/profit-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }
      setSettings(data.settings);
      setMessage("Profit-first settings saved.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading profit-first settings...</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#111827" }}>
          Profit-First Compensation
        </h2>
        <p style={{ margin: "0.35rem 0 0", color: "#6b7280", lineHeight: 1.5 }}>
          Every job must produce positive contribution profit, protect company margin, and only pay
          partners after collected revenue and completed service.
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: "0.875rem 1rem",
            borderRadius: "8px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            fontSize: "0.875rem",
          }}
        >
          {message}
        </div>
      )}

      <div style={cardStyle()}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700 }}>Editable Targets</h3>
        <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            ["Residential first bin pay ($)", "residentialFirstBinPayCents", 100],
            ["Residential additional bin ($)", "residentialAdditionalBinPayCents", 100],
            ["Referral signup commission ($)", "referralSignupCommissionCents", 100],
            ["Commercial labor commission (%)", "commercialLaborCommissionPercent", 1],
            ["Commercial minimum payout ($)", "commercialMinimumPayoutCents", 100],
            ["Residential target margin (%)", "residentialMargins.targetPercent", 1],
          ].map(([label, key, divisor]) => {
            const numericDivisor = Number(divisor);
            return (
            <label key={String(key)} style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>{label}</span>
              <input
                type="number"
                value={
                  String(key).includes(".")
                    ? settings?.residentialMargins?.targetPercent ?? 50
                    : Math.round(Number(settings?.[key as string] || 0) / numericDivisor)
                }
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (String(key).includes(".")) {
                    setSettings((current: any) => ({
                      ...current,
                      residentialMargins: {
                        ...current.residentialMargins,
                        targetPercent: value,
                      },
                    }));
                  } else {
                    setSettings((current: any) => ({
                      ...current,
                      [key as string]: Math.round(value * numericDivisor),
                    }));
                  }
                }}
                style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
              />
            </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          style={{
            marginTop: "1rem",
            padding: "0.625rem 1rem",
            background: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Profit Settings"}
        </button>
      </div>

      <div style={cardStyle(economics?.marginStatus)}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700 }}>Job Profit Preview</h3>
        <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Job type
            <select
              value={jobForm.category}
              onChange={(e) => setJobForm((current) => ({ ...current, category: e.target.value }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Customer pays ($)
            <input
              type="number"
              value={jobForm.customerPayment}
              onChange={(e) => setJobForm((current) => ({ ...current, customerPayment: Number(e.target.value) }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Partner model
            <select
              value={jobForm.partnerModel}
              onChange={(e) => setJobForm((current) => ({ ...current, partnerModel: e.target.value }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="none">None</option>
              <option value="referral">Referral ($10 default)</option>
              <option value="service">Service partner split</option>
            </select>
          </label>
          {jobForm.category === "residential" ? (
            <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
              Bins at stop
              <input
                type="number"
                min={1}
                value={jobForm.bins}
                onChange={(e) => setJobForm((current) => ({ ...current, bins: Number(e.target.value) }))}
                style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
              />
            </label>
          ) : (
            <>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
                Labor revenue ($)
                <input
                  type="number"
                  value={jobForm.invoiceLabor}
                  onChange={(e) => setJobForm((current) => ({ ...current, invoiceLabor: Number(e.target.value) }))}
                  style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
                Difficulty bonus ($)
                <input
                  type="number"
                  value={jobForm.difficultyBonus}
                  onChange={(e) =>
                    setJobForm((current) => ({ ...current, difficultyBonus: Number(e.target.value) }))
                  }
                  style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={runJobPreview}
          style={{
            marginTop: "1rem",
            padding: "0.625rem 1rem",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Calculate Job Profit
        </button>

        {economics && (
          <div style={{ marginTop: "1rem" }}>
            <JobEconomicsSummary
              plainLanguage={economics.plainLanguage}
              marginStatus={economics.marginStatus}
              approvalRequired={economics.approvalRequired}
            />
          </div>
        )}
      </div>

      <div style={cardStyle()}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700 }}>Pricing Floor Calculator</h3>
        <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Job type
            <select
              value={floorForm.category}
              onChange={(e) => setFloorForm((current) => ({ ...current, category: e.target.value }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Estimated direct cost ($)
            <input
              type="number"
              value={floorForm.estimatedDirectCost}
              onChange={(e) =>
                setFloorForm((current) => ({ ...current, estimatedDirectCost: Number(e.target.value) }))
              }
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={runPricingFloor}
          style={{
            marginTop: "1rem",
            padding: "0.625rem 1rem",
            background: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Calculate Minimum Price
        </button>
        {pricingFloor && (
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.35rem", fontSize: "0.9375rem" }}>
            <div><strong>Estimated direct cost:</strong> ${(pricingFloor.estimatedDirectCostCents / 100).toFixed(2)}</div>
            <div><strong>Minimum profitable price:</strong> ${(pricingFloor.minimumProfitablePriceCents / 100).toFixed(2)}</div>
            <div><strong>Recommended price:</strong> ${(pricingFloor.recommendedPriceCents / 100).toFixed(2)}</div>
            <div><strong>Expected contribution margin:</strong> {pricingFloor.expectedContributionMarginPercent.toFixed(1)}%</div>
          </div>
        )}
      </div>

      <div style={cardStyle(routeEconomics?.contributionProfitCents < 0 ? "unprofitable" : undefined)}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700 }}>Route Economics</h3>
        <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Stops on route
            <input
              type="number"
              min={1}
              value={routeForm.stops}
              onChange={(e) => setRouteForm((current) => ({ ...current, stops: Number(e.target.value) }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Route hours
            <input
              type="number"
              min={1}
              step={0.5}
              value={routeForm.routeHours}
              onChange={(e) => setRouteForm((current) => ({ ...current, routeHours: Number(e.target.value) }))}
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8125rem" }}>
            Revenue per stop ($)
            <input
              type="number"
              value={routeForm.customerPayment}
              onChange={(e) =>
                setRouteForm((current) => ({ ...current, customerPayment: Number(e.target.value) }))
              }
              style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={runRouteEconomics}
          style={{
            marginTop: "1rem",
            padding: "0.625rem 1rem",
            background: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Calculate Route Profit
        </button>
        {routeEconomics && (
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.35rem", fontSize: "0.9375rem" }}>
            <div><strong>Route health:</strong> {routeEconomics.routeHealthLabel}</div>
            <div><strong>Customers:</strong> {routeEconomics.customers}</div>
            <div><strong>Total bins:</strong> {routeEconomics.totalBins}</div>
            <div><strong>Collected revenue:</strong> ${(routeEconomics.collectedRevenueCents / 100).toFixed(2)}</div>
            <div><strong>Employee pay:</strong> ${(routeEconomics.employeePayCents / 100).toFixed(2)}</div>
            <div><strong>Partner commissions:</strong> ${(routeEconomics.partnerCommissionsCents / 100).toFixed(2)}</div>
            <div><strong>Total direct cost:</strong> ${(routeEconomics.totalDirectCostCents / 100).toFixed(2)}</div>
            <div><strong>Contribution profit:</strong> ${(routeEconomics.contributionProfitCents / 100).toFixed(2)}</div>
            <div><strong>Contribution margin:</strong> {routeEconomics.contributionMarginPercent.toFixed(1)}%</div>
            <div><strong>Profit per stop:</strong> ${(routeEconomics.profitPerStopCents / 100).toFixed(2)}</div>
            {routeEconomics.profitPerRouteHourCents != null && (
              <div><strong>Profit per route hour:</strong> ${(routeEconomics.profitPerRouteHourCents / 100).toFixed(2)}</div>
            )}
            {routeEconomics.warnings?.length > 0 && (
              <div style={{ color: "#b45309" }}>
                <strong>Warnings:</strong> {routeEconomics.warnings.join(" · ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
