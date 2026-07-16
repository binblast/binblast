"use client";

import { useMemo } from "react";
import { UpcomingCleaningCard } from "@/components/CustomerDashboard/UpcomingCleaningCard";
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
  const resolvedPlanId = ((planId as PlanId) || "one-time") as PlanId;

  const coverageSummary = useMemo(
    () => buildUpcomingCleaningCoverage(cleanings, resolvedPlanId, cleaningCredits),
    [cleanings, cleaningCredits, resolvedPlanId]
  );

  const partitions = useMemo(
    () => partitionUpcomingCleanings(cleanings, coverageSummary),
    [cleanings, coverageSummary]
  );

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
        onEdit={() => onEdit(cleaning)}
      />
    );
  };

  return (
    <>
      {partitions.confirmed.length > 0 ? (
        <div className="customer-cleaning-groups">
          <div className="customer-cleaning-groups__list">{partitions.confirmed.map(renderCard)}</div>
        </div>
      ) : (
        <div className="customer-cleaning-groups__empty">
          <p style={{ color: "#6b7280", margin: 0 }}>No upcoming cleanings scheduled.</p>
        </div>
      )}

    </>
  );
}
