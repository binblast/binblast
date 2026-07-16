"use client";

import { useCallback, useEffect, useState } from "react";
import { startExtraCleaningCheckout } from "@/lib/extra-cleaning-checkout";

interface UpgradePreview {
  newPlanId: string;
  newPlanName: string;
  newPlanPrice: number;
  proratedAmount: number;
  daysRemaining: number;
  cleaningCreditsRollover: number;
}

interface ScheduleLimitBannerProps {
  userId: string;
  onUpgradeClick?: (payload: {
    planName: string;
    scheduledCount: number;
    baseAllowance: number;
    oneTimePrice: number;
    upgradePreview: UpgradePreview;
    upgradeBlockedReason: string | null;
  }) => void;
}

export function ScheduleLimitBanner({ userId, onUpgradeClick }: ScheduleLimitBannerProps) {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [baseAllowance, setBaseAllowance] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [oneTimePrice, setOneTimePrice] = useState(35);
  const [upgradePreview, setUpgradePreview] = useState<UpgradePreview | null>(null);
  const [upgradeBlockedReason, setUpgradeBlockedReason] = useState<string | null>(null);
  const [isAtLimit, setIsAtLimit] = useState(false);

  const loadEligibility = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/customer/cleaning-schedule-eligibility?userId=${encodeURIComponent(userId)}&intent=add_cleaning`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to check plan limits");
      }

      setPlanName(data.planName || "Your plan");
      setBaseAllowance(data.allocation?.baseAllowance || 0);
      setScheduledCount(data.allocation?.scheduledCount || 0);
      setOneTimePrice(data.options?.oneTimeCleaning?.price || 35);
      setUpgradePreview(data.options?.upgradeToBiWeekly || null);
      setUpgradeBlockedReason(data.options?.upgradeBlockedReason || null);
      setIsAtLimit(Boolean(data.allocation?.isAtLimit));
    } catch (err: any) {
      setError(err.message || "Failed to load plan limits");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadEligibility();
  }, [userId, loadEligibility]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    const result = await startExtraCleaningCheckout(userId);
    if (result.error) {
      setError(result.error);
      setCheckoutLoading(false);
    }
  };

  if (loading || !isAtLimit) {
    return null;
  }

  return (
    <div className="customer-schedule-limit">
      <div className="customer-schedule-limit__copy">
        <strong>Plan limit reached</strong>
        <p>
          Your <span>{planName}</span> includes {baseAllowance} cleaning
          {baseAllowance === 1 ? "" : "s"} this month. You already have {scheduledCount}{" "}
          scheduled. Pay for an extra visit at full price or upgrade to add another cleaning.
        </p>
      </div>
      <div className="customer-schedule-limit__actions">
        <button
          type="button"
          className="customer-schedule-limit__btn customer-schedule-limit__btn--primary"
          onClick={handleCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? "Redirecting to checkout..." : `Pay $${oneTimePrice.toFixed(2)} — Stripe checkout`}
        </button>
        {upgradePreview && !upgradeBlockedReason ? (
          <button
            type="button"
            className="customer-schedule-limit__btn customer-schedule-limit__btn--secondary"
            onClick={() =>
              onUpgradeClick?.({
                planName,
                scheduledCount,
                baseAllowance,
                oneTimePrice,
                upgradePreview,
                upgradeBlockedReason,
              })
            }
            disabled={checkoutLoading}
          >
            Upgrade to {upgradePreview.newPlanName}
          </button>
        ) : null}
      </div>
      {upgradeBlockedReason ? (
        <p className="customer-schedule-limit__note">{upgradeBlockedReason}</p>
      ) : null}
      {error ? <p className="customer-schedule-limit__error">{error}</p> : null}
    </div>
  );
}
