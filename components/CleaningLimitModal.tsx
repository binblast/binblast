"use client";

import { useEffect, useState } from "react";

interface UpgradePreview {
  newPlanId: string;
  newPlanName: string;
  newPlanPrice: number;
  proratedAmount: number;
  daysRemaining: number;
  cleaningCreditsRollover: number;
}

interface CleaningLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  scheduledCount: number;
  baseAllowance: number;
  oneTimePrice: number;
  upgradePreview: UpgradePreview | null;
  upgradeBlockedReason?: string | null;
  userId: string;
  onPurchaseComplete?: () => void;
  onUpgradeComplete?: () => void;
}

export function CleaningLimitModal({
  isOpen,
  onClose,
  planName,
  scheduledCount,
  baseAllowance,
  oneTimePrice,
  upgradePreview,
  upgradeBlockedReason,
  userId,
  onPurchaseComplete,
  onUpgradeComplete,
}: CleaningLimitModalProps) {
  const [step, setStep] = useState<"options" | "upgrade-warning">("options");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [applyCredit, setApplyCredit] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    async function loadCredits() {
      try {
        const response = await fetch(`/api/referral/get-credits?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();
        if (response.ok) {
          const total = Number(data.totalCredits) || 0;
          setAvailableCredit(total);
          setApplyCredit(total > 0);
        }
      } catch (creditError) {
        console.error("[CleaningLimitModal] Failed to load referral credits:", creditError);
      }
    }

    loadCredits();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleOneTimePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/one-time-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, applyCredit: applyCredit && availableCredit > 0 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      onPurchaseComplete?.();
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/upgrade-on-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPlanId: upgradePreview?.newPlanId || "twice-month",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upgrade subscription");
      }
      onUpgradeComplete?.();
      onClose();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      window.location.href = `/dashboard?plan_upgrade=success&schedule_cleaning=1&new_plan=${data.newPlanId || "twice-month"}`;
    } catch (err: any) {
      setError(err.message || "Failed to upgrade subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("options");
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "clamp(1.25rem, 4vw, 1.75rem)",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "options" ? (
          <>
            <h2
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              Cleaning Limit Reached
            </h2>
            <p style={{ margin: "0 0 1rem", color: "#4b5563", lineHeight: 1.5 }}>
              Your <strong>{planName}</strong> includes {baseAllowance} cleaning
              {baseAllowance === 1 ? "" : "s"} per billing period. You already
              have {scheduledCount} scheduled for this period.
            </p>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "#6b7280",
                fontSize: "0.9375rem",
              }}
            >
              Choose how you&apos;d like to add another cleaning at your plan rate:
            </p>

            <button
              type="button"
              onClick={handleOneTimePurchase}
              disabled={loading}
              style={{
                width: "100%",
                marginBottom: "0.75rem",
                padding: "0.875rem 1rem",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#111827",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? "Redirecting..."
                : applyCredit && availableCredit > 0
                  ? `Buy One-Time Cleaning — $${Math.max(0, oneTimePrice - Math.min(10, availableCredit)).toFixed(2)} (with $${Math.min(10, availableCredit).toFixed(2)} credit)`
                  : `Buy One-Time Cleaning — $${oneTimePrice.toFixed(2)}`}
            </button>

            {availableCredit > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  fontSize: "0.875rem",
                  color: "#047857",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={applyCredit}
                  onChange={(event) => setApplyCredit(event.target.checked)}
                  style={{ marginTop: "0.2rem" }}
                />
                <span>
                  Apply ${Math.min(10, availableCredit).toFixed(2)} referral credit from your
                  account (${availableCredit.toFixed(2)} available)
                </span>
              </label>
            )}

            {upgradePreview && (
              <button
                type="button"
                onClick={() => setStep("upgrade-warning")}
                disabled={loading || Boolean(upgradeBlockedReason)}
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  borderRadius: "10px",
                  border: "none",
                  background: upgradeBlockedReason ? "#9ca3af" : "#16a34a",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: loading || upgradeBlockedReason ? "not-allowed" : "pointer",
                }}
              >
                Upgrade to {upgradePreview.newPlanName} — ${upgradePreview.newPlanPrice}/month
              </button>
            )}

            {upgradeBlockedReason ? (
              <p style={{ margin: "0.75rem 0 0", color: "#92400e", fontSize: "0.875rem", lineHeight: 1.5 }}>
                {upgradeBlockedReason}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: "100%",
                marginTop: "0.75rem",
                padding: "0.75rem",
                border: "none",
                background: "transparent",
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              Confirm Upgrade
            </h2>
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: 0, color: "#92400e", lineHeight: 1.5 }}>
                You are upgrading to <strong>{upgradePreview?.newPlanName}</strong>.
                {upgradePreview && upgradePreview.proratedAmount > 0 ? (
                  <>
                    {" "}
                    Your card on file will be charged{" "}
                    <strong>${upgradePreview.proratedAmount.toFixed(2)}</strong>{" "}
                    today for the prorated difference based on what you&apos;ve
                    already paid this billing period ({upgradePreview.daysRemaining}{" "}
                    days remaining).
                  </>
                ) : (
                  <> No additional charge is required today.</>
                )}
              </p>
              {upgradePreview && upgradePreview.cleaningCreditsRollover > 0 && (
                <p
                  style={{
                    margin: "0.75rem 0 0",
                    color: "#92400e",
                    fontSize: "0.875rem",
                  }}
                >
                  {upgradePreview.cleaningCreditsRollover} unused cleaning credit
                  {upgradePreview.cleaningCreditsRollover > 1 ? "s" : ""} will roll
                  over to your new plan.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmUpgrade}
              disabled={loading}
              style={{
                width: "100%",
                marginBottom: "0.75rem",
                padding: "0.875rem 1rem",
                borderRadius: "10px",
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Processing..." : "Confirm Upgrade & Charge Card"}
            </button>

            <button
              type="button"
              onClick={() => setStep("options")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "none",
                background: "transparent",
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
