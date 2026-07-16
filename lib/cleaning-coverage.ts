import {
  buildCleaningAllocation,
  parseCleaningDate,
} from "@/lib/cleaning-allocation";
import { getExtraCleaningPriceDollars } from "@/lib/cleaning-scheduling-policy";
import { PlanId } from "@/lib/stripe-config";

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
}

export interface CleaningCoverageSummary {
  byId: Record<string, CleaningCoverageInfo>;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
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

export function getCleaningSlotKey(cleaning: CleaningCoverageRecord): string {
  const date = parseCleaningDate(cleaning.scheduledDate);
  const dateKey = date ? date.toISOString().split("T")[0] : "unknown-date";
  const timeKey = (cleaning.scheduledTime || "unknown-time").trim().toLowerCase();
  const addressKey = (cleaning.addressLine1 || "").trim().toLowerCase();
  const zipKey = (cleaning.zipCode || "").trim().toLowerCase();
  return `${dateKey}|${timeKey}|${addressKey}|${zipKey}`;
}

function isActiveCleaning(cleaning: CleaningCoverageRecord): boolean {
  const status = cleaning.status || cleaning.jobStatus;
  return status !== "cancelled" && status !== "completed";
}

export function buildCleaningCoverageSummary(
  cleanings: CleaningCoverageRecord[],
  planId: PlanId,
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  cleaningCreditsRemaining = 0
): CleaningCoverageSummary {
  const extraCleaningPrice = getExtraCleaningPriceDollars(planId);
  const allocation = buildCleaningAllocation(
    planId,
    billingPeriodStart,
    billingPeriodEnd,
    cleanings,
    cleaningCreditsRemaining
  );

  const inPeriod = cleanings
    .filter((cleaning) => {
      if (!isActiveCleaning(cleaning)) return false;
      const date = parseCleaningDate(cleaning.scheduledDate);
      if (!date) return false;
      return date >= billingPeriodStart && date <= billingPeriodEnd;
    })
    .sort((a, b) => {
      const dateDiff =
        (parseCleaningDate(a.scheduledDate)?.getTime() || 0) -
        (parseCleaningDate(b.scheduledDate)?.getTime() || 0);
      if (dateDiff !== 0) return dateDiff;
      return parseCreatedAt(a.createdAt) - parseCreatedAt(b.createdAt);
    });

  const extrasInPeriod = Math.max(0, inPeriod.length - allocation.baseAllowance);
  const unpaidExtras = Math.max(0, extrasInPeriod - cleaningCreditsRemaining);
  const paidExtraSlots = Math.max(0, extrasInPeriod - unpaidExtras);

  const slotPrimary = new Map<string, string>();
  for (const cleaning of inPeriod) {
    const slotKey = getCleaningSlotKey(cleaning);
    if (!slotPrimary.has(slotKey)) {
      slotPrimary.set(slotKey, cleaning.id);
    }
  }

  const byId: Record<string, CleaningCoverageInfo> = {};
  let paymentRequiredCount = 0;
  let duplicateCount = 0;

  inPeriod.forEach((cleaning, index) => {
    const slotKey = getCleaningSlotKey(cleaning);
    const primaryCleaningId = slotPrimary.get(slotKey) || cleaning.id;
    const isDuplicate = primaryCleaningId !== cleaning.id;

    let status: CleaningCoverageStatus;
    if (isDuplicate) {
      status = "duplicate_slot";
      duplicateCount += 1;
    } else if (cleaning.billingCoverage === "paid_extra") {
      status = "paid_extra";
    } else if (cleaning.billingCoverage === "plan_included") {
      status = "included_in_plan";
    } else if (index < allocation.baseAllowance) {
      status = "included_in_plan";
    } else if (index - allocation.baseAllowance < paidExtraSlots) {
      status = "paid_extra";
    } else {
      status = "payment_required";
      paymentRequiredCount += 1;
    }

    byId[cleaning.id] = {
      id: cleaning.id,
      status,
      slotKey,
      isDuplicate,
      primaryCleaningId,
      extraCleaningPrice,
      sortIndex: index,
    };
  });

  for (const cleaning of cleanings) {
    if (byId[cleaning.id] || !isActiveCleaning(cleaning)) continue;
    byId[cleaning.id] = {
      id: cleaning.id,
      status: "included_in_plan",
      slotKey: getCleaningSlotKey(cleaning),
      isDuplicate: false,
      primaryCleaningId: cleaning.id,
      extraCleaningPrice,
      sortIndex: 999,
    };
  }

  return {
    byId,
    billingPeriodStart,
    billingPeriodEnd,
    baseAllowance: allocation.baseAllowance,
    cleaningCreditsRemaining,
    extraCleaningPrice,
    paymentRequiredCount,
    duplicateCount,
  };
}

export function getCoverageLabel(status: CleaningCoverageStatus): string {
  switch (status) {
    case "included_in_plan":
      return "Included in your plan";
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

export function shouldDisplayUpcomingCleaning(coverage?: CleaningCoverageInfo): boolean {
  if (!coverage) return true;
  return !coverage.isDuplicate;
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
    if (!coverage || coverage.isDuplicate) {
      if (coverage?.isDuplicate) duplicates.push(cleaning);
      continue;
    }
    if (coverage.status === "payment_required") {
      needsPayment.push(cleaning);
    } else {
      confirmed.push(cleaning);
    }
  }

  return { confirmed, needsPayment, duplicates };
}
