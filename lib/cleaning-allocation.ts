import { PlanId } from "./stripe-config";

export interface CleaningAllocation {
  planId: PlanId;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  baseAllowance: number;
  cleaningCredits: number;
  scheduledCount: number;
  effectiveAllowance: number;
  remainingSlots: number;
  canScheduleAnother: boolean;
  isAtLimit: boolean;
}

export function parseCleaningDate(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.includes("T")
      ? new Date(value)
      : new Date(`${value}T12:00:00`);
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: number }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }

  return null;
}

export function getCleaningsAllowedInPeriod(
  planId: PlanId,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): number {
  const totalDays = Math.max(
    1,
    Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  switch (planId) {
    case "one-time":
      return 1;
    case "twice-month":
      return 2;
    case "bi-monthly":
      return Math.max(1, Math.round((6 * totalDays) / 365));
    case "quarterly":
      return Math.max(1, Math.round((4 * totalDays) / 365));
    default:
      return 0;
  }
}

export function countCleaningsInPeriod(
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): number {
  return cleanings.filter((cleaning) => {
    const status = cleaning.status || cleaning.jobStatus;
    if (status === "cancelled") return false;

    const cleaningDate = parseCleaningDate(cleaning.scheduledDate);
    if (!cleaningDate) return false;

    return (
      cleaningDate >= billingPeriodStart && cleaningDate <= billingPeriodEnd
    );
  }).length;
}

export function buildCleaningAllocation(
  planId: PlanId,
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>,
  cleaningCredits = 0
): CleaningAllocation {
  const baseAllowance = getCleaningsAllowedInPeriod(
    planId,
    billingPeriodStart,
    billingPeriodEnd
  );
  const scheduledCount = countCleaningsInPeriod(
    cleanings,
    billingPeriodStart,
    billingPeriodEnd
  );
  const effectiveAllowance = baseAllowance + Math.max(0, cleaningCredits);
  const remainingSlots = Math.max(0, effectiveAllowance - scheduledCount);

  return {
    planId,
    billingPeriodStart,
    billingPeriodEnd,
    baseAllowance,
    cleaningCredits: Math.max(0, cleaningCredits),
    scheduledCount,
    effectiveAllowance,
    remainingSlots,
    canScheduleAnother: scheduledCount < effectiveAllowance,
    isAtLimit: scheduledCount >= effectiveAllowance,
  };
}

export function shouldConsumeCleaningCredit(
  allocation: CleaningAllocation
): boolean {
  return allocation.scheduledCount >= allocation.baseAllowance;
}
