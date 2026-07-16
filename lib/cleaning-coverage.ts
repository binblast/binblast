import { parseCleaningDate } from "@/lib/cleaning-allocation";
import { getExtraCleaningPriceDollars } from "@/lib/cleaning-scheduling-policy";
import { PlanId } from "@/lib/stripe-config";
import { getCleaningsPerMonth } from "@/lib/subscription-utils";

export type CleaningCoverageStatus =
  | "included_in_plan"
  | "paid_extra"
  | "payment_required"
  | "duplicate_slot";

export interface CleaningCoverageRecord {
  id: string;
  scheduledDate?: unknown;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
  createdAt?: unknown;
  addressLine1?: string;
  zipCode?: string;
  billingCoverage?: "plan_included" | "paid_extra";
}

export interface CleaningCoverageInfo {
  id: string;
  status: CleaningCoverageStatus;
  slotKey: string;
  isDuplicate: boolean;
  primaryCleaningId: string;
  extraCleaningPrice: number;
  sortIndex: number;
  calendarMonthKey: string;
}

export interface CleaningCoverageSummary {
  byId: Record<string, CleaningCoverageInfo>;
  baseAllowance: number;
  cleaningCreditsRemaining: number;
  extraCleaningPrice: number;
  paymentRequiredCount: number;
  duplicateCount: number;
}

function parseCreatedAt(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}

function isActiveCleaning(cleaning: CleaningCoverageRecord): boolean {
  const status = cleaning.status || cleaning.jobStatus;
  return status !== "cancelled" && status !== "completed";
}

function compareCleanings(a: CleaningCoverageRecord, b: CleaningCoverageRecord): number {
  const dateDiff =
    (parseCleaningDate(a.scheduledDate)?.getTime() || 0) -
    (parseCleaningDate(b.scheduledDate)?.getTime() || 0);
  if (dateDiff !== 0) return dateDiff;
  return parseCreatedAt(a.createdAt) - parseCreatedAt(b.createdAt);
}

export function getCleaningSlotKey(cleaning: CleaningCoverageRecord): string {
  const date = parseCleaningDate(cleaning.scheduledDate);
  const dateKey = date ? date.toISOString().split("T")[0] : "unknown-date";
  const timeKey = (cleaning.scheduledTime || "unknown-time").trim().toLowerCase();
  const addressKey = (cleaning.addressLine1 || "").trim().toLowerCase();
  const zipKey = (cleaning.zipCode || "").trim().toLowerCase();
  return `${dateKey}|${timeKey}|${addressKey}|${zipKey}`;
}

function getCalendarMonthKey(value: unknown): string | null {
  const date = parseCleaningDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthlyDisplayAllowance(planId: PlanId): number {
  return Math.max(1, getCleaningsPerMonth(planId) || 1);
}

/**
 * Customer-facing coverage uses calendar months so "1 cleaning per month" matches the UI copy.
 */
export function buildUpcomingCleaningCoverage(
  cleanings: CleaningCoverageRecord[],
  planId: PlanId,
  cleaningCreditsRemaining = 0
): CleaningCoverageSummary {
  const baseAllowance = getMonthlyDisplayAllowance(planId);
  const extraCleaningPrice = getExtraCleaningPriceDollars(planId);
  const activeCleanings = cleanings.filter(isActiveCleaning).sort(compareCleanings);

  const slotPrimary = new Map<string, string>();
  for (const cleaning of activeCleanings) {
    const slotKey = getCleaningSlotKey(cleaning);
    if (!slotPrimary.has(slotKey)) {
      slotPrimary.set(slotKey, cleaning.id);
    }
  }

  const byMonth = new Map<string, CleaningCoverageRecord[]>();
  for (const cleaning of activeCleanings) {
    const monthKey = getCalendarMonthKey(cleaning.scheduledDate) || "unknown-month";
    const monthCleanings = byMonth.get(monthKey) || [];
    monthCleanings.push(cleaning);
    byMonth.set(monthKey, monthCleanings);
  }

  const byId: Record<string, CleaningCoverageInfo> = {};
  const paymentRequiredIds: string[] = [];
  let duplicateCount = 0;
  let sortIndex = 0;

  for (const monthCleanings of byMonth.values()) {
    monthCleanings.sort(compareCleanings);

    monthCleanings.forEach((cleaning, indexInMonth) => {
      const slotKey = getCleaningSlotKey(cleaning);
      const primaryCleaningId = slotPrimary.get(slotKey) || cleaning.id;
      const isDuplicate = primaryCleaningId !== cleaning.id;
      const calendarMonthKey = getCalendarMonthKey(cleaning.scheduledDate) || "unknown";

      let status: CleaningCoverageStatus;
      if (isDuplicate) {
        status = "duplicate_slot";
        duplicateCount += 1;
      } else if (cleaning.billingCoverage === "paid_extra") {
        status = "paid_extra";
      } else if (indexInMonth < baseAllowance) {
        // Allowance is positional per calendar month — ignore stale plan_included flags on legacy rows.
        status = "included_in_plan";
      } else {
        status = "payment_required";
        paymentRequiredIds.push(cleaning.id);
      }

      byId[cleaning.id] = {
        id: cleaning.id,
        status,
        slotKey,
        isDuplicate,
        primaryCleaningId,
        extraCleaningPrice,
        sortIndex,
        calendarMonthKey,
      };
      sortIndex += 1;
    });
  }

  paymentRequiredIds.sort((a, b) => {
    const cleaningA = activeCleanings.find((cleaning) => cleaning.id === a);
    const cleaningB = activeCleanings.find((cleaning) => cleaning.id === b);
    if (!cleaningA || !cleaningB) return 0;
    return compareCleanings(cleaningA, cleaningB);
  });

  let creditsLeft = Math.max(0, cleaningCreditsRemaining);
  for (const cleaningId of paymentRequiredIds) {
    if (creditsLeft <= 0) break;
    byId[cleaningId].status = "paid_extra";
    creditsLeft -= 1;
  }

  const paymentRequiredCount = Object.values(byId).filter(
    (entry) => entry.status === "payment_required"
  ).length;

  return {
    byId,
    baseAllowance,
    cleaningCreditsRemaining,
    extraCleaningPrice,
    paymentRequiredCount,
    duplicateCount,
  };
}

/** @deprecated Prefer buildUpcomingCleaningCoverage for customer dashboard display. */
export function buildCleaningCoverageSummary(
  cleanings: CleaningCoverageRecord[],
  planId: PlanId,
  _billingPeriodStart: Date,
  _billingPeriodEnd: Date,
  cleaningCreditsRemaining = 0
): CleaningCoverageSummary {
  return buildUpcomingCleaningCoverage(cleanings, planId, cleaningCreditsRemaining);
}

export function getCoverageLabel(status: CleaningCoverageStatus): string {
  switch (status) {
    case "included_in_plan":
      return "Scheduled";
    case "paid_extra":
      return "Extra cleaning — paid";
    case "payment_required":
      return "Payment required";
    case "duplicate_slot":
      return "Duplicate time slot";
    default:
      return "Scheduled";
  }
}

export function partitionUpcomingCleanings<T extends { id: string }>(
  cleanings: T[],
  coverageSummary: CleaningCoverageSummary
): {
  confirmed: T[];
  needsPayment: T[];
  duplicates: T[];
} {
  const confirmed: T[] = [];
  const needsPayment: T[] = [];
  const duplicates: T[] = [];

  for (const cleaning of cleanings) {
    const coverage = coverageSummary.byId[cleaning.id];
    if (!coverage || coverage.status === "payment_required") {
      if (coverage?.status === "payment_required") {
        needsPayment.push(cleaning);
      }
      continue;
    }
    if (coverage.isDuplicate) {
      duplicates.push(cleaning);
      continue;
    }
    confirmed.push(cleaning);
  }

  return { confirmed, needsPayment, duplicates };
}
