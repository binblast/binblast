// components/SubscriptionManager.tsx
// IMPORTANT: This component is dynamically imported in the dashboard to prevent
// Firebase initialization errors during page bundling. It should never be statically imported.

"use client";

import React, { useState, useEffect } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { usePlatformPricing } from "@/hooks/usePlatformPricing";
import { getMonthlyPriceForPlan, canChangePlan, calculateCleaningRollover } from "@/lib/subscription-utils";

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
  const { plans: platformPlans } = usePlatformPricing();
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
  const [cleaningsUsed, setCleaningsUsed] = useState<number>(0);
  const [billingPeriodStart, setBillingPeriodStart] = useState<Date | null>(null);

  const closeModal = () => {
    if (loading) return;
    setShowChangeModal(false);
    setSelectedNewPlan(null);
    setError(null);
    setModalStep("select");
    setSuccessDetails(null);
  };

  // Safety checks - don't render if required props are missing or invalid
  if (!userId || !currentPlanId || !(platformPlans[currentPlanId] || PLAN_CONFIGS[currentPlanId])) {
    console.warn("[SubscriptionManager] Missing required props:", { userId: !!userId, currentPlanId });
    return null;
  }

  const currentPlan = platformPlans[currentPlanId] || PLAN_CONFIGS[currentPlanId];
  if (!currentPlan) {
    console.warn("[SubscriptionManager] Plan not found:", currentPlanId);
    return null;
  }

  const currentMonthlyPrice = getMonthlyPriceForPlan(currentPlanId, platformPlans);
  if (isNaN(currentMonthlyPrice) || currentMonthlyPrice <= 0) {
    console.warn("[SubscriptionManager] Invalid monthly price:", currentMonthlyPrice);
    return null;
  }

  const availablePlans = Object.values(platformPlans).filter(
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

      const amountOwed = typeof data.proration.proratedAmountOwed === 'number' 
          ? (data.proration.proratedAmountOwed >= 100 ? data.proration.proratedAmountOwed / 100 : data.proration.proratedAmountOwed)
          : parseFloat(data.proration.proratedAmountOwed) || 0;
      const credit = typeof data.proration.proratedCredit === 'number'
          ? (data.proration.proratedCredit >= 100 ? data.proration.proratedCredit / 100 : data.proration.proratedCredit)
          : parseFloat(data.proration.proratedCredit) || 0;

      const newPlan = platformPlans[newPlanId] || PLAN_CONFIGS[newPlanId];
      let message = "Your subscription has been updated.";
      if (data.proration.isUpgrade && amountOwed > 0) {
        message = `Your plan is now ${newPlan.name}. A prorated charge of $${amountOwed.toFixed(2)} has been applied for the upgrade.`;
      } else if (credit > 0) {
        message = `Your plan is now ${newPlan.name}. You received a $${credit.toFixed(2)} credit for the remaining days on your previous plan.`;
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

  // Load cleanings used in current billing period
  useEffect(() => {
    if (!userId || !billingPeriodEnd || !billingPeriodStart) return;

    async function loadCleaningsUsed() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const db = await getDbInstance();
        if (!db || !billingPeriodStart) return;

        const firestore = await safeImportFirestore();
        const { collection, query, where, getDocs } = firestore;
        
        const cleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("userId", "==", userId)
        );
        const cleaningsSnapshot = await getDocs(cleaningsQuery);
        
        let used = 0;
        cleaningsSnapshot.forEach((doc) => {
          const cleaningData = doc.data();
          const cleaningDate = cleaningData.scheduledDate?.toDate?.() || new Date(cleaningData.scheduledDate);
          const isCompleted = cleaningData.status === "completed" || cleaningData.jobStatus === "completed";
          
          if (isCompleted && billingPeriodStart && billingPeriodEnd && cleaningDate >= billingPeriodStart && cleaningDate <= billingPeriodEnd) {
            used++;
          }
        });
        
        setCleaningsUsed(used);
      } catch (err) {
        console.error("[SubscriptionManager] Error loading cleanings:", err);
      }
    }

    loadCleaningsUsed();
  }, [userId, billingPeriodStart, billingPeriodEnd]);

  // Load billing period start from Stripe subscription
  useEffect(() => {
    if (!stripeSubscriptionId) return;

    async function loadBillingPeriod() {
      try {
        const response = await fetch(`/api/stripe/get-subscription?subscriptionId=${stripeSubscriptionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.billingPeriodStart) {
            setBillingPeriodStart(new Date(data.billingPeriodStart * 1000));
          }
        }
      } catch (err) {
        console.error("[SubscriptionManager] Error loading billing period:", err);
      }
    }

    loadBillingPeriod();
  }, [stripeSubscriptionId]);

  const calculateProrationPreview = (newPlanId: PlanId) => {
    if (!billingPeriodEnd || !billingPeriodStart) return null;

    const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId, platformPlans);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const totalDays = Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyRateCurrent = currentMonthlyPrice / totalDays;
    const proratedCredit = dailyRateCurrent * daysRemaining;

    const dailyRateNew = newMonthlyPrice / totalDays;
    const proratedAmountNew = dailyRateNew * daysRemaining;

    const isUpgrade = newMonthlyPrice > currentMonthlyPrice;
    const proratedAmountOwed = isUpgrade ? proratedAmountNew - proratedCredit : 0;

    // Calculate cleaning credits rollover
    const cleaningCreditsRollover = billingPeriodStart && billingPeriodEnd
      ? calculateCleaningRollover(
          currentPlanId,
          billingPeriodStart,
          billingPeriodEnd,
          cleaningsUsed
        )
      : 0;

    return {
      daysRemaining,
      proratedCredit: isUpgrade ? 0 : proratedCredit,
      proratedAmountOwed,
      isUpgrade,
      cleaningCreditsRollover,
      cleaningsUsed,
    };
  };

  if (!canChangePlan(currentPlanId)) {
    console.log("[SubscriptionManager] Plan cannot be changed:", currentPlanId);
    return null; // Don't show for commercial plans
  }

  console.log("[SubscriptionManager] Rendering component for plan:", currentPlanId);

  const selectedPlanConfig = selectedNewPlan ? (platformPlans[selectedNewPlan] || PLAN_CONFIGS[selectedNewPlan]) : null;
  const selectedMonthlyPrice = selectedNewPlan ? getMonthlyPriceForPlan(selectedNewPlan, platformPlans) : 0;
  const confirmProration = selectedNewPlan ? calculateProrationPreview(selectedNewPlan) : null;

  return (
    <>
      <button
        onClick={() => {
          console.log("[SubscriptionManager] Change Plan button clicked");
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
                <button onClick={closeModal} className="btn btn-primary" style={{ width: "100%" }}>
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
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Current Plan</p>
                    <p style={{ margin: "0 0 0.25rem", fontWeight: "700", color: "var(--text-dark)" }}>{currentPlan.name}</p>
                    <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#374151" }}>
                      ${currentMonthlyPrice.toFixed(2)}<span style={{ fontSize: "0.875rem", fontWeight: "500" }}>/month</span>
                    </p>
                  </div>
                  <div style={{ padding: "1.25rem", background: "#ecfdf5", borderRadius: "12px", border: "2px solid #16a34a" }}>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#047857", textTransform: "uppercase" }}>New Plan</p>
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
                    {confirmProration.cleaningCreditsRollover > 0 && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "#16a34a", fontWeight: "500" }}>
                        {confirmProration.cleaningCreditsRollover} unused cleaning{confirmProration.cleaningCreditsRollover > 1 ? "s" : ""} will roll over
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
                    {error}
                  </div>
                )}
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button onClick={() => { setModalStep("select"); setError(null); }} disabled={loading} style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#ffffff", cursor: loading ? "not-allowed" : "pointer", color: "var(--text-dark)" }}>
                    Back
                  </button>
                  <button onClick={() => handlePlanChange(selectedNewPlan)} disabled={loading} className="btn btn-primary" style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
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
                  const newMonthlyPrice = getMonthlyPriceForPlan(plan.id, platformPlans);
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
                          {proration.cleaningCreditsRollover > 0 && (
                            <div style={{ marginTop: "0.5rem", color: "#16a34a", fontWeight: "500" }}>
                              {proration.cleaningCreditsRollover} unused cleaning{proration.cleaningCreditsRollover > 1 ? 's' : ''} will roll over to your new plan
                            </div>
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

