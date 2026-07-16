import { PlanId, PLAN_CONFIGS } from "./stripe-config";
import { getCleaningsPerMonth } from "./subscription-utils";

export const MODIFY_LOCK_HOURS = 24;
export const UPGRADE_MIN_HOURS = 4;

const TIME_WINDOW_START_HOUR: Record<string, number> = {
  "6:00 AM - 9:00 AM": 6,
  "9:00 AM - 12:00 PM": 9,
  "12:00 PM - 3:00 PM": 12,
  "3:00 PM - 6:00 PM": 15,
};

export interface UpcomingCleaningRef {
  id?: string;
  scheduledDate?: unknown;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
}

export interface SchedulingPolicyState {
  hoursUntilCleaning: number | null;
  canReschedule: boolean;
  canCancel: boolean;
  canUpgradePlan: boolean;
  canDowngradePlan: boolean;
  lockReason: "within_4h" | "within_24h" | null;
  message: string | null;
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.includes("T")
      ? new Date(value)
      : new Date(`${value}T12:00:00`);
  }

  if (value instanceof Date) {
    return new Date(value);
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

export function parseCleaningDateTime(
  scheduledDate: unknown,
  scheduledTime?: string
): Date | null {
  const date = parseDateValue(scheduledDate);
  if (!date) return null;

  const startHour =
    scheduledTime && TIME_WINDOW_START_HOUR[scheduledTime] !== undefined
      ? TIME_WINDOW_START_HOUR[scheduledTime]
      : 9;

  date.setHours(startHour, 0, 0, 0);
  return date;
}

export function hoursUntilCleaning(
  scheduledDate: unknown,
  scheduledTime?: string
): number | null {
  const cleaningAt = parseCleaningDateTime(scheduledDate, scheduledTime);
  if (!cleaningAt) return null;
  return (cleaningAt.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function getSchedulingPolicyState(
  scheduledDate?: unknown,
  scheduledTime?: string
): SchedulingPolicyState {
  const hours = scheduledDate ? hoursUntilCleaning(scheduledDate, scheduledTime) : null;

  if (hours === null) {
    return {
      hoursUntilCleaning: null,
      canReschedule: true,
      canCancel: true,
      canUpgradePlan: true,
      canDowngradePlan: true,
      lockReason: null,
      message: null,
    };
  }

  if (hours < UPGRADE_MIN_HOURS) {
    return {
      hoursUntilCleaning: hours,
      canReschedule: false,
      canCancel: false,
      canUpgradePlan: false,
      canDowngradePlan: false,
      lockReason: "within_4h",
      message:
        "No changes can be made within 4 hours of your scheduled cleaning.",
    };
  }

  if (hours < MODIFY_LOCK_HOURS) {
    return {
      hoursUntilCleaning: hours,
      canReschedule: false,
      canCancel: false,
      canUpgradePlan: true,
      canDowngradePlan: false,
      lockReason: "within_24h",
      message:
        "Rescheduling and cancellation are locked within 24 hours of your cleaning. Plan upgrades are still available until 4 hours before your visit.",
    };
  }

  return {
    hoursUntilCleaning: hours,
    canReschedule: true,
    canCancel: true,
    canUpgradePlan: true,
    canDowngradePlan: true,
    lockReason: null,
    message: null,
  };
}

export function canModifyScheduledCleaning(
  scheduledDate: unknown,
  scheduledTime?: string
): boolean {
  return getSchedulingPolicyState(scheduledDate, scheduledTime).canReschedule;
}

export function canUpgradeWithUpcomingCleaning(
  scheduledDate?: unknown,
  scheduledTime?: string
): boolean {
  return getSchedulingPolicyState(scheduledDate, scheduledTime).canUpgradePlan;
}

export function canChangePlanWithUpcomingCleaning(
  isUpgrade: boolean,
  scheduledDate?: unknown,
  scheduledTime?: string
): { allowed: boolean; message?: string } {
  const policy = getSchedulingPolicyState(scheduledDate, scheduledTime);

  if (isUpgrade) {
    return policy.canUpgradePlan
      ? { allowed: true }
      : {
          allowed: false,
          message:
            policy.message ||
            "Plan upgrades cannot be made within 4 hours of your scheduled cleaning.",
        };
  }

  return policy.canDowngradePlan
    ? { allowed: true }
    : {
        allowed: false,
        message:
          policy.message ||
          "Plan downgrades and other changes are locked within 24 hours of your scheduled cleaning.",
      };
}

export function getNextUpcomingCleaning<T extends UpcomingCleaningRef>(
  cleanings: T[]
): T | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = cleanings
    .filter((cleaning) => {
      const status = cleaning.status || cleaning.jobStatus;
      if (status === "cancelled" || status === "completed") return false;
      const date = parseDateValue(cleaning.scheduledDate);
      if (!date) return false;
      date.setHours(0, 0, 0, 0);
      return date >= now;
    })
    .sort((a, b) => {
      const dateA = parseDateValue(a.scheduledDate)?.getTime() ?? 0;
      const dateB = parseDateValue(b.scheduledDate)?.getTime() ?? 0;
      return dateA - dateB;
    });

  return upcoming[0] ?? null;
}

export function getExtraCleaningPriceCents(planId: PlanId): number {
  const plan = PLAN_CONFIGS[planId];
  if (!plan || plan.price <= 0) {
    return 3500;
  }

  if (planId === "bi-monthly") {
    return Math.round((plan.price * 100) / 6);
  }

  if (planId === "quarterly") {
    return Math.round((plan.price * 100) / 4);
  }

  const cleaningsPerMonth = getCleaningsPerMonth(planId);
  if (cleaningsPerMonth <= 0) {
    return plan.price * 100;
  }

  return Math.round((plan.price * 100) / cleaningsPerMonth);
}

export function getExtraCleaningPriceDollars(planId: PlanId): number {
  return getExtraCleaningPriceCents(planId) / 100;
}
