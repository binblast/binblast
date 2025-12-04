// components/SubscriptionManager.tsx
// IMPORTANT: This component is dynamically imported in the dashboard to prevent
// Firebase initialization errors during page bundling. It should never be statically imported.

"use client";

import React, { useState } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { getMonthlyPriceForPlan, canChangePlan } from "@/lib/subscription-utils";

interface SubscriptionManagerProps {
  userId: string;
  currentPlanId: PlanId;
  stripeSubscriptionId: string | null;
  stripeCustomerId?: string | null;
  billingPeriodEnd?: Date;
  onPlanChanged?: () => void;
}

export function SubscriptionManager({
  userId,
  currentPlanId,
  stripeSubscriptionId,
  stripeCustomerId,
  billingPeriodEnd,
  onPlanChanged,
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanId | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Safety checks - don't render if required props are missing or invalid
  if (!userId || !currentPlanId || !PLAN_CONFIGS[currentPlanId]) {
    return null;
  }

  const currentPlan = PLAN_CONFIGS[currentPlanId];
  if (!currentPlan) {
    return null;
  }

  const currentMonthlyPrice = getMonthlyPriceForPlan(currentPlanId);
  if (isNaN(currentMonthlyPrice) || currentMonthlyPrice <= 0) {
    return null;
  }

  const availablePlans = Object.values(PLAN_CONFIGS).filter(
    (plan) => plan && canChangePlan(plan.id) && plan.id !== currentPlanId
  );

  const handlePlanChange = async (newPlanId: PlanId) => {
    // Allow plan changes even if no subscription (for one-time to subscription conversion)
    if (!stripeSubscriptionId && !stripeCustomerId) {
      setError("No payment method found. Please contact support.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/change-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          newPlanId,
          currentSubscriptionId: stripeSubscriptionId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change subscription");
      }

      // Show success message
      alert(
        `Subscription changed successfully! ${
          data.proration.isUpgrade
            ? `You owe $${(data.proration.proratedAmountOwed / 100).toFixed(2)} for the upgrade.`
            : `You received a credit of $${(data.proration.proratedCredit / 100).toFixed(2)} for the remaining days.`
        }`
      );

      setShowChangeModal(false);
      setSelectedNewPlan(null);

      if (onPlanChanged) {
        onPlanChanged();
      }
    } catch (err: any) {
      setError(err.message || "Failed to change subscription");
    } finally {
      setLoading(false);
    }
  };

  const calculateProrationPreview = (newPlanId: PlanId) => {
    if (!billingPeriodEnd) return null;

    const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Assume 30-day billing cycle for calculation
    const totalDays = 30;
    const dailyRateCurrent = currentMonthlyPrice / totalDays;
    const proratedCredit = dailyRateCurrent * daysRemaining;

    const dailyRateNew = newMonthlyPrice / totalDays;
    const proratedAmountNew = dailyRateNew * daysRemaining;

    const isUpgrade = newMonthlyPrice > currentMonthlyPrice;
    const proratedAmountOwed = isUpgrade ? proratedAmountNew - proratedCredit : 0;

    return {
      daysRemaining,
      proratedCredit: isUpgrade ? 0 : proratedCredit,
      proratedAmountOwed,
      isUpgrade,
    };
  };

  if (!canChangePlan(currentPlanId)) {
    return null; // Don't show for commercial plans
  }

  return (
    <>
      <button
        onClick={() => setShowChangeModal(true)}
        className="btn btn-primary"
        style={{ marginTop: "1rem" }}
      >
        Change Plan
      </button>

      {showChangeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => !loading && setShowChangeModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1.5rem",
                color: "var(--text-dark)",
              }}
            >
              Change Your Subscription Plan
            </h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.95rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                Current Plan:
              </p>
              <div
                style={{
                  padding: "1rem",
                  background: "#ecfdf5",
                  borderRadius: "12px",
                  border: "1px solid #16a34a",
                }}
              >
                <p style={{ margin: 0, fontWeight: "600", color: "#047857" }}>
                  {currentPlan.name} - ${currentMonthlyPrice.toFixed(2)}/month
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-light)",
                  marginBottom: "1rem",
                }}
              >
                Select New Plan:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {availablePlans.map((plan) => {
                  const newMonthlyPrice = getMonthlyPriceForPlan(plan.id);
                  const proration = calculateProrationPreview(plan.id);
                  const isSelected = selectedNewPlan === plan.id;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedNewPlan(plan.id)}
                      disabled={loading}
                      style={{
                        padding: "1rem 1.5rem",
                        borderRadius: "12px",
                        border: `2px solid ${isSelected ? "#16a34a" : "#e5e7eb"}`,
                        background: isSelected ? "#ecfdf5" : "#ffffff",
                        cursor: loading ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>
                          {plan.name}
                        </span>
                        <span style={{ fontWeight: "600", color: "#16a34a" }}>
                          ${newMonthlyPrice.toFixed(2)}/month
                        </span>
                      </div>
                      {proration && (
                        <div style={{ fontSize: "0.875rem", color: "var(--text-light)" }}>
                          {proration.isUpgrade ? (
                            <span>
                              You&apos;ll owe approximately $
                              {proration.proratedAmountOwed.toFixed(2)} for the upgrade
                            </span>
                          ) : (
                            <span>
                              You&apos;ll receive approximately $
                              {proration.proratedCredit.toFixed(2)} credit for remaining days
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowChangeModal(false);
                  setSelectedNewPlan(null);
                  setError(null);
                }}
                disabled={loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: loading ? "not-allowed" : "pointer",
                  color: "var(--text-dark)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => selectedNewPlan && handlePlanChange(selectedNewPlan)}
                disabled={loading || !selectedNewPlan}
                className="btn btn-primary"
                style={{
                  opacity: loading || !selectedNewPlan ? 0.6 : 1,
                  cursor: loading || !selectedNewPlan ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Processing..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

