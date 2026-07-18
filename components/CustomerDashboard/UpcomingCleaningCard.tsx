"use client";

import { CleaningJobPrepDetails } from "@/components/CleaningReadinessBanner";
import {
  evaluateCleaningReadiness,
  getReadinessLabel,
  getReadinessStyle,
} from "@/lib/cleaning-readiness";
import {
  getSchedulingPolicyState,
  canModifyScheduledCleaning,
} from "@/lib/cleaning-scheduling-policy";
import {
  CleaningCoverageStatus,
  getCoverageLabel,
} from "@/lib/cleaning-coverage";

interface UpcomingCleaningCardProps {
  cleaning: {
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
    internalNotes?: string;
  };
  cleaningDate: Date;
  scheduleSummary?: string | null;
  planId?: string;
  binsCount?: number;
  paymentStatus?: string;
  subscriptionStatus?: string;
  servicePaused?: boolean;
  coverageStatus?: CleaningCoverageStatus;
  onEdit: () => void;
}

export function UpcomingCleaningCard({
  cleaning,
  cleaningDate,
  scheduleSummary,
  planId,
  binsCount = 1,
  paymentStatus,
  subscriptionStatus,
  servicePaused,
  coverageStatus,
  onEdit,
}: UpcomingCleaningCardProps) {
  const isIncluded = coverageStatus === "included_in_plan";
  const isPaidExtra = coverageStatus === "paid_extra";

  const readiness = evaluateCleaningReadiness(
    {
      scheduledDate: cleaningDate.toISOString().split("T")[0],
      scheduledTime: cleaning.scheduledTime,
      status: cleaning.status,
      jobStatus: cleaning.jobStatus,
      binsCount: cleaning.binsCount || binsCount,
      notes: cleaning.notes,
      trashDay: cleaning.trashDay,
    },
    {
      paymentStatus,
      subscriptionStatus,
      servicePaused,
    }
  );
  const readinessStyle = getReadinessStyle(readiness.status);
  const policy = getSchedulingPolicyState(cleaning.scheduledDate, cleaning.scheduledTime);
  const canEdit = canModifyScheduledCleaning(cleaning.scheduledDate, cleaning.scheduledTime);

  const coverageLabel = coverageStatus ? getCoverageLabel(coverageStatus) : getReadinessLabel(readiness.status);
  const badgeStyle = isIncluded
    ? { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }
    : isPaidExtra
      ? { background: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" }
      : {
          background: readinessStyle.background,
          color: readinessStyle.color,
          borderColor: readinessStyle.border,
        };

  return (
    <article
      className={`customer-cleaning-card${isIncluded ? " customer-cleaning-card--included" : ""}`}
    >
      <div className="customer-cleaning-card__header">
        <div className="customer-cleaning-card__heading">
          <h4 className="customer-cleaning-card__date">
            {cleaningDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h4>
        </div>
        <span className="customer-cleaning-card__status" style={badgeStyle}>
          {coverageLabel}
        </span>
      </div>

      <div className="customer-cleaning-card__body">
        <p>
          <strong>Address:</strong> {cleaning.addressLine1}
          {cleaning.addressLine2 ? `, ${cleaning.addressLine2}` : ""}, {cleaning.city},{" "}
          {cleaning.state} {cleaning.zipCode}
        </p>
        <CleaningJobPrepDetails
          binsCount={cleaning.binsCount || binsCount}
          planId={planId}
          trashDay={cleaning.trashDay}
          notes={cleaning.notes}
          showInternalNotes={false}
          showScheduleFields={false}
        />
      </div>

      <div className="customer-cleaning-card__actions">
        {canEdit ? (
          <button type="button" className="customer-cleaning-card__btn" onClick={onEdit}>
            Reschedule
          </button>
        ) : (
          <span className="customer-cleaning-card__locked">Changes locked</span>
        )}
        {!canEdit && policy.message ? (
          <p className="customer-cleaning-card__policy">{policy.message}</p>
        ) : null}
      </div>
    </article>
  );
}
