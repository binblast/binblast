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
    if (status === "cancelled" || status === "completed") return false;

    const cleaningDate = parseCleaningDate(cleaning.scheduledDate);
    if (!cleaningDate) return false;

    return (
      cleaningDate >= billingPeriodStart && cleaningDate <= billingPeriodEnd
    );
  }).length;
}

export function getCalendarMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function planUsesCalendarMonthLimits(planId: PlanId): boolean {
  return planId === "one-time" || planId === "twice-month";
}

export function getMonthlyBaseAllowance(planId: PlanId): number {
  switch (planId) {
    case "one-time":
      return 1;
    case "twice-month":
      return 2;
    default:
      return 0;
  }
}

export function countCleaningsInCalendarMonth(
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>,
  monthDate: Date
): number {
  const { start, end } = getCalendarMonthBounds(monthDate);
  return countCleaningsInPeriod(cleanings, start, end);
}

/** True if at least one calendar month in the next booking window still has capacity. */
export function canScheduleInNextBookingWindow(
  planId: PlanId,
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>,
  cleaningCredits = 0,
  windowDays = 14
): boolean {
  const baseAllowance = getMonthlyBaseAllowance(planId);
  if (baseAllowance === 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthsToCheck = new Set<string>();

  for (let offset = 1; offset <= windowDays; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    monthsToCheck.add(`${candidate.getFullYear()}-${candidate.getMonth()}`);
  }

  for (const monthKey of monthsToCheck) {
    const [year, month] = monthKey.split("-").map(Number);
    const scheduledCount = countCleaningsInCalendarMonth(cleanings, new Date(year, month, 1));
    const effectiveAllowance = baseAllowance + Math.max(0, cleaningCredits);
    if (scheduledCount < effectiveAllowance) {
      return true;
    }
  }

  return false;
}

export function canScheduleOnDate(
  planId: PlanId,
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>,
  scheduledDate: unknown,
  cleaningCredits = 0
): boolean {
  if (planUsesCalendarMonthLimits(planId)) {
    const targetDate = parseCleaningDate(scheduledDate);
    if (!targetDate) return false;
    const baseAllowance = getMonthlyBaseAllowance(planId);
    const scheduledCount = countCleaningsInCalendarMonth(cleanings, targetDate);
    const effectiveAllowance = baseAllowance + Math.max(0, cleaningCredits);
    return scheduledCount < effectiveAllowance;
  }

  return true;
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
  cleaningCredits = 0,
  options?: { targetScheduleDate?: unknown }
): CleaningAllocation {
  let periodStart = billingPeriodStart;
  let periodEnd = billingPeriodEnd;
  let baseAllowance = getCleaningsAllowedInPeriod(
    planId,
    billingPeriodStart,
    billingPeriodEnd
  );

  if (planUsesCalendarMonthLimits(planId)) {
    baseAllowance = getMonthlyBaseAllowance(planId);
    const targetDate =
      parseCleaningDate(options?.targetScheduleDate) || new Date();
    const bounds = getCalendarMonthBounds(targetDate);
    periodStart = bounds.start;
    periodEnd = bounds.end;
  }

  const scheduledCount = countCleaningsInPeriod(
    cleanings,
    periodStart,
    periodEnd
  );
  const effectiveAllowance = baseAllowance + Math.max(0, cleaningCredits);
  const remainingSlots = Math.max(0, effectiveAllowance - scheduledCount);

  const canScheduleAnother = planUsesCalendarMonthLimits(planId)
    ? options?.targetScheduleDate
      ? scheduledCount < effectiveAllowance
      : canScheduleInNextBookingWindow(planId, cleanings, cleaningCredits)
    : scheduledCount < effectiveAllowance;

  return {
    planId,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    baseAllowance,
    cleaningCredits: Math.max(0, cleaningCredits),
    scheduledCount,
    effectiveAllowance,
    remainingSlots,
    canScheduleAnother,
    isAtLimit: !canScheduleAnother,
  };
}

export function shouldConsumeCleaningCredit(
  allocation: CleaningAllocation
): boolean {
  return allocation.scheduledCount >= allocation.baseAllowance;
}
