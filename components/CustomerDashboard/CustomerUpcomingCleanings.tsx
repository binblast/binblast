"use client";

import { useEffect, useMemo, useState } from "react";
import { UpcomingCleaningCard } from "@/components/CustomerDashboard/UpcomingCleaningCard";
import { CleaningLimitModal } from "@/components/CleaningLimitModal";
import {
  buildUpcomingCleaningCoverage,
  partitionUpcomingCleanings,
} from "@/lib/cleaning-coverage";
import { formatRecurringScheduleSummary } from "@/lib/recurring-preference";
import { PlanId } from "@/lib/stripe-config";

interface CleaningItem {
  id: string;
  scheduledDate: string | { toDate?: () => Date };
  scheduledTime?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  trashDay?: string;
  notes?: string;
  binsCount?: number;
  status?: string;
  jobStatus?: string;
  createdAt?: unknown;
}

interface CustomerUpcomingCleaningsProps {
  userId: string;
  cleanings: CleaningItem[];
  planId?: string;
  cleaningCredits?: number;
  getCleaningDate: (cleaning: CleaningItem) => Date;
  preferredDayOfWeek?: string;
  binsCount?: number;
  paymentStatus?: string;
  subscriptionStatus?: string;
  servicePaused?: boolean;
  onEdit: (cleaning: CleaningItem) => void;
}

export function CustomerUpcomingCleanings({
  userId,
  cleanings,
  planId,
  cleaningCredits = 0,
  getCleaningDate,
  preferredDayOfWeek,
  binsCount = 1,
  paymentStatus,
  subscriptionStatus,
  servicePaused,
  onEdit,
}: CustomerUpcomingCleaningsProps) {
  const [planName, setPlanName] = useState("Your plan");
  const [upgradePreview, setUpgradePreview] = useState<any>(null);
  const [upgradeBlockedReason, setUpgradeBlockedReason] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const resolvedPlanId = ((planId as PlanId) || "one-time") as PlanId;

  const coverageSummary = useMemo(
    () => buildUpcomingCleaningCoverage(cleanings, resolvedPlanId, cleaningCredits),
    [cleanings, cleaningCredits, resolvedPlanId]
  );

  const partitions = useMemo(
    () => partitionUpcomingCleanings(cleanings, coverageSummary),
    [cleanings, coverageSummary]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadUpgradeOptions() {
      try {
        const response = await fetch(
          `/api/customer/cleaning-schedule-eligibility?userId=${encodeURIComponent(userId)}`
        );
        const data = await response.json();
        if (!response.ok || cancelled) return;

        setPlanName(data.planName || "Your plan");
        setUpgradePreview(data.options?.upgradeToBiWeekly || null);
        setUpgradeBlockedReason(data.options?.upgradeBlockedReason || null);
      } catch (error) {
        console.error("[CustomerUpcomingCleanings] Failed to load upgrade options:", error);
      }
    }

    loadUpgradeOptions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const scheduleSummaryFor = (cleaning: CleaningItem) =>
    formatRecurringScheduleSummary(planId, cleaning.trashDay || preferredDayOfWeek);

  const renderCard = (cleaning: CleaningItem) => {
    const coverage = coverageSummary.byId[cleaning.id];
    return (
      <UpcomingCleaningCard
        key={cleaning.id}
        cleaning={cleaning}
        cleaningDate={getCleaningDate(cleaning)}
        scheduleSummary={scheduleSummaryFor(cleaning)}
        planId={planId}
        binsCount={binsCount}
        paymentStatus={paymentStatus}
        subscriptionStatus={subscriptionStatus}
        servicePaused={servicePaused}
        coverageStatus={coverage?.status}
        extraCleaningPrice={coverage?.extraCleaningPrice ?? coverageSummary.extraCleaningPrice}
        userId={userId}
        onEdit={() => onEdit(cleaning)}
        onUpgrade={
          upgradePreview && !upgradeBlockedReason
            ? () => setShowUpgradeModal(true)
            : undefined
        }
      />
    );
  };

  return (
    <>
      {partitions.confirmed.length > 0 ? (
        <div className="customer-cleaning-groups">
          <div className="customer-cleaning-groups__list">{partitions.confirmed.map(renderCard)}</div>
        </div>
      ) : partitions.needsPayment.length === 0 ? (
        <div className="customer-cleaning-groups__empty">
          <p style={{ color: "#6b7280", margin: 0 }}>
            No confirmed cleanings this month. Complete payment below to keep extra visits on the calendar.
          </p>
        </div>
      ) : null}

      {partitions.needsPayment.length > 0 ? (
        <section className="customer-cleaning-groups customer-cleaning-groups--payment">
          <div className="customer-cleaning-groups__header">
            <h4 className="customer-cleaning-groups__title">Payment required</h4>
            <p className="customer-cleaning-groups__subtitle">
              Your {planName} includes {coverageSummary.baseAllowance} cleaning
              {coverageSummary.baseAllowance === 1 ? "" : "s"} per month. These extra visits in the same
              month need payment or a plan upgrade before service.
            </p>
          </div>
          <div className="customer-cleaning-groups__list">{partitions.needsPayment.map(renderCard)}</div>
        </section>
      ) : null}

      {partitions.duplicates.length > 0 ? (
        <section className="customer-cleaning-groups customer-cleaning-groups--duplicate">
          <div className="customer-cleaning-groups__header">
            <h4 className="customer-cleaning-groups__title">Duplicate bookings removed</h4>
            <p className="customer-cleaning-groups__subtitle">
              {partitions.duplicates.length} duplicate booking
              {partitions.duplicates.length === 1 ? "" : "s"} for the same day and time{" "}
              {partitions.duplicates.length === 1 ? "was" : "were"} hidden. Only one visit is performed per time
              slot.
            </p>
          </div>
        </section>
      ) : null}

      {upgradePreview && (
        <CleaningLimitModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          planName={planName}
          scheduledCount={cleanings.length}
          baseAllowance={coverageSummary.baseAllowance}
          oneTimePrice={coverageSummary.extraCleaningPrice}
          upgradePreview={upgradePreview}
          upgradeBlockedReason={upgradeBlockedReason}
          userId={userId}
          onUpgradeComplete={() => {
            setShowUpgradeModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
