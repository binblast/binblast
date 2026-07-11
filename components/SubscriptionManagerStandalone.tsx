// components/SubscriptionManagerStandalone.tsx
// This is a completely standalone version that doesn't import anything that could trigger Firebase
"use client";

import React, { useState } from "react";

// Inline plan configs to avoid importing stripe-config
const PLAN_CONFIGS: Record<string, { id: string; name: string; price: number; priceSuffix: string }> = {
  "one-time": {
    id: "one-time",
    name: "Monthly Clean",
    price: 35,
    priceSuffix: "/month",
  },
  "twice-month": {
    id: "twice-month",
    name: "Bi-Weekly Clean (2x/Month)",
    price: 65,
    priceSuffix: "/month",
  },
  "bi-monthly": {
    id: "bi-monthly",
    name: "Bi-Monthly Plan – Yearly Package",
    price: 210,
    priceSuffix: "/year",
  },
  "quarterly": {
    id: "quarterly",
    name: "Quarterly Plan – Yearly Package",
    price: 160,
    priceSuffix: "/year",
  },
};

type PlanId = "one-time" | "twice-month" | "bi-monthly" | "quarterly" | "commercial";

interface SubscriptionManagerStandaloneProps {
  userId: string;
  currentPlanId: PlanId;
  stripeSubscriptionId: string | null;
  stripeCustomerId?: string | null;
  billingPeriodEnd?: Date;
  onPlanChanged?: () => void;
}

function getMonthlyPriceForPlan(planId: PlanId): number {
  const plan = PLAN_CONFIGS[planId];
  if (!plan) return 0;
  
  if (planId === "one-time") {
    return plan.price;
  }
  
  if (plan.priceSuffix === "/year") {
    return plan.price / 12;
  }
  
  if (plan.priceSuffix === "/month") {
    return plan.price;
  }
  
  return 0;
}

function canChangePlan(planId: PlanId): boolean {
  return planId !== "commercial";
}

export function SubscriptionManagerStandalone({
  userId,
  currentPlanId,
  stripeSubscriptionId,
  stripeCustomerId,
  billingPeriodEnd,
  onPlanChanged,
}: SubscriptionManagerStandaloneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanId | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [modalStep, setModalStep] = useState<"select" | "confirm" | "success">("select");
  const [successDetails, setSuccessDetails] = useState<{
    title: string;
    message: string;
    cleaningCreditsRollover?: number;
  } | null>(null);

  const closeModal = () => {
    if (loading) return;
    setShowChangeModal(false);
    setSelectedNewPlan(null);
    setError(null);
    setModalStep("select");
    setSuccessDetails(null);
  };

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
    (plan) => plan && canChangePlan(plan.id as PlanId) && plan.id !== currentPlanId
  );

  const handlePlanChange = async (newPlanId: PlanId) => {
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

      console.log("[SubscriptionManager] Response:", data);

      // If payment is required, redirect to Stripe Checkout
      if (data.requiresPayment && data.checkoutUrl) {
        console.log("[SubscriptionManager] Redirecting to Stripe Checkout:", data.checkoutUrl);
        // Store plan change info for callback
        sessionStorage.setItem("pendingPlanChange", newPlanId);
        sessionStorage.setItem("pendingSubscriptionId", stripeSubscriptionId || "");
        
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
        return; // Don't close modal yet - will close after payment
      }

      console.log("[SubscriptionManager] No payment required, completing change directly");

      // If no payment required (downgrade), show success modal
      const proratedAmount =
        typeof data.proration?.proratedAmountOwed === "number"
          ? data.proration.proratedAmountOwed >= 100
            ? data.proration.proratedAmountOwed / 100
            : data.proration.proratedAmountOwed
          : parseFloat(data.proration?.proratedAmountOwed) || 0;
      const proratedCredit =
        typeof data.proration?.proratedCredit === "number"
          ? data.proration.proratedCredit >= 100
            ? data.proration.proratedCredit / 100
            : data.proration.proratedCredit
          : parseFloat(data.proration?.proratedCredit) || 0;

      const newPlan = selectedNewPlan ? PLAN_CONFIGS[selectedNewPlan] : null;
      let message = "Your subscription has been updated.";
      if (data.proration?.isUpgrade && proratedAmount > 0) {
        message = `Your plan is now ${newPlan?.name || "updated"}. A prorated charge of $${proratedAmount.toFixed(2)} has been applied for the upgrade.`;
      } else if (proratedCredit > 0) {
        message = `Your plan is now ${newPlan?.name || "updated"}. You received a $${proratedCredit.toFixed(2)} credit for the remaining days on your previous plan.`;
      }

      setSuccessDetails({
        title: "Plan Updated Successfully",
        message,
        cleaningCreditsRollover: data.cleaningCredits?.rollover || 0,
      });
      setModalStep("success");

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
    return null;
  }

  const selectedPlanConfig = selectedNewPlan ? PLAN_CONFIGS[selectedNewPlan] : null;
  const selectedMonthlyPrice = selectedNewPlan ? getMonthlyPriceForPlan(selectedNewPlan) : 0;
  const confirmProration = selectedNewPlan ? calculateProrationPreview(selectedNewPlan) : null;

  return (
    <>
      <button
        onClick={() => {
          setModalStep("select");
          setShowChangeModal(true);
        }}
        className="btn btn-primary"
        style={{ 
          marginTop: "1rem",
          display: "block",
          width: "100%",
          maxWidth: "300px"
        }}
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
          onClick={closeModal}
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
            {modalStep === "success" && successDetails ? (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#16a34a",
                    fontSize: "2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}>
                    ✓
                  </div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    {successDetails.title}
                  </h2>
                  <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
                    {successDetails.message}
                  </p>
                  {(successDetails.cleaningCreditsRollover || 0) > 0 && (
                    <p style={{ margin: "1rem 0 0", color: "#16a34a", fontWeight: "600" }}>
                      {successDetails.cleaningCreditsRollover} unused cleaning
                      {(successDetails.cleaningCreditsRollover || 0) > 1 ? "s have" : " has"} been rolled over to your new plan.
                    </p>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  Done
                </button>
              </>
            ) : modalStep === "confirm" && selectedNewPlan && selectedPlanConfig ? (
              <>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  Confirm Your Plan Change
                </h2>
                <p style={{ fontSize: "0.95rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                  Review your current plan and new plan costs before confirming.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ padding: "1.25rem", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>
                      Current Plan
                    </p>
                    <p style={{ margin: "0 0 0.25rem", fontWeight: "700", color: "var(--text-dark)" }}>{currentPlan.name}</p>
                    <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#374151" }}>
                      ${currentMonthlyPrice.toFixed(2)}<span style={{ fontSize: "0.875rem", fontWeight: "500" }}>/month</span>
                    </p>
                  </div>
                  <div style={{ padding: "1.25rem", background: "#ecfdf5", borderRadius: "12px", border: "2px solid #16a34a" }}>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#047857", textTransform: "uppercase" }}>
                      New Plan
                    </p>
                    <p style={{ margin: "0 0 0.25rem", fontWeight: "700", color: "var(--text-dark)" }}>{selectedPlanConfig.name}</p>
                    <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
                      ${selectedMonthlyPrice.toFixed(2)}<span style={{ fontSize: "0.875rem", fontWeight: "500" }}>/month</span>
                    </p>
                  </div>
                </div>

                {confirmProration && (
                  <div style={{
                    padding: "1rem 1.25rem",
                    background: confirmProration.isUpgrade ? "#fffbeb" : "#eff6ff",
                    borderRadius: "12px",
                    border: `1px solid ${confirmProration.isUpgrade ? "#fde68a" : "#bfdbfe"}`,
                    marginBottom: "1.5rem",
                  }}>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: confirmProration.isUpgrade ? "#92400e" : "#1e40af", fontWeight: "600" }}>
                      {confirmProration.isUpgrade
                        ? `Today's prorated upgrade charge: $${confirmProration.proratedAmountOwed.toFixed(2)}`
                        : `Account credit for remaining days: $${confirmProration.proratedCredit.toFixed(2)}`}
                    </p>
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                      {confirmProration.daysRemaining} day{confirmProration.daysRemaining !== 1 ? "s" : ""} remaining in your current billing period.
                    </p>
                  </div>
                )}

                {error && (
                  <div style={{
                    padding: "0.75rem 1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setModalStep("select");
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
                    Back
                  </button>
                  <button
                    onClick={() => handlePlanChange(selectedNewPlan)}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                  >
                    {loading ? "Processing..." : confirmProration?.isUpgrade ? "Confirm Upgrade" : "Confirm Change"}
                  </button>
                </div>
              </>
            ) : (
              <>
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
                  const newMonthlyPrice = getMonthlyPriceForPlan(plan.id as PlanId);
                  const proration = calculateProrationPreview(plan.id as PlanId);
                  const isSelected = selectedNewPlan === plan.id;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedNewPlan(plan.id as PlanId)}
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
                onClick={closeModal}
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
                onClick={() => {
                  if (selectedNewPlan) {
                    setModalStep("confirm");
                    setError(null);
                  }
                }}
                disabled={loading || !selectedNewPlan}
                className="btn btn-primary"
                style={{
                  opacity: loading || !selectedNewPlan ? 0.6 : 1,
                  cursor: loading || !selectedNewPlan ? "not-allowed" : "pointer",
                }}
              >
                Review Change
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

