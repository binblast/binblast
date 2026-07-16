import { formatCleaningDateForStorage } from "@/lib/cleaning-schedule";
import { getNextCleaningDate } from "@/lib/scheduling";
import { PLAN_CONFIGS, type PlanId } from "@/lib/stripe-config";

export interface RecurringPreferenceInput {
  preferredDayOfWeek: string;
  preferredTimeWindow?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  zipCode?: string;
}

/** Fields written to users/{id} when a customer sets or changes their recurring day. */
export function buildRecurringPreferenceUpdate(input: RecurringPreferenceInput) {
  const update: Record<string, unknown> = {
    preferredDayOfWeek: input.preferredDayOfWeek,
    recurringScheduleActive: true,
  };

  if (input.preferredTimeWindow) {
    update.preferredTimeWindow = input.preferredTimeWindow;
  }
  if (input.addressLine1) update.addressLine1 = input.addressLine1;
  if (input.addressLine2 !== undefined) update.addressLine2 = input.addressLine2 || null;
  if (input.city) update.city = input.city;
  if (input.state) update.state = input.state;
  if (input.zipCode) update.zipCode = input.zipCode;

  return update;
}

/** Resolve the weekday used for auto-scheduling after a job completes. */
export function resolveStickyCleaningDay(
  completedCleaning: { trashDay?: string | null },
  userData: {
    preferredDayOfWeek?: string | null;
    trashDay?: string | null;
  }
): string | null {
  return (
    completedCleaning.trashDay ||
    userData.preferredDayOfWeek ||
    userData.trashDay ||
    null
  );
}

/** Next calendar occurrence of a weekday on or after today (for form pre-fill). */
export function getNextOccurrenceOfWeekday(dayName: string, from: Date = new Date()): Date {
  return getNextCleaningDate(dayName, "WEEKLY", from);
}

export function formatDateForFormInput(date: Date): string {
  return formatCleaningDateForStorage(date);
}

export function formatRecurringDayLabel(dayName?: string | null): string | null {
  if (!dayName?.trim()) return null;
  return `Every ${dayName.trim()}`;
}

const PLAN_RECURRING_FREQUENCY: Record<PlanId, string> = {
  "one-time": "1 cleaning per month",
  "twice-month": "2 cleanings per month (every 2 weeks)",
  "bi-monthly": "6 cleanings per year (every ~2 months)",
  "quarterly": "4 cleanings per year (every ~3 months)",
  commercial: "Custom cleaning schedule",
};

/** How often cleanings repeat for the customer's purchased package. */
export function getPlanRecurringFrequencyLabel(planId?: string | null): string | null {
  if (!planId || !(planId in PLAN_RECURRING_FREQUENCY)) return null;
  return PLAN_RECURRING_FREQUENCY[planId as PlanId];
}

/** Combined weekday + package frequency, e.g. "Every Monday · 1 cleaning per month". */
export function formatRecurringScheduleSummary(
  planId?: string | null,
  dayName?: string | null
): string | null {
  const dayLabel = formatRecurringDayLabel(dayName);
  const frequencyLabel = getPlanRecurringFrequencyLabel(planId);

  if (dayLabel && frequencyLabel) return `${dayLabel} · ${frequencyLabel}`;
  if (dayLabel) return dayLabel;
  if (frequencyLabel) return frequencyLabel;
  return null;
}

/** Customer-facing hint in the schedule form based on their plan. */
export function getPlanRecurringHint(planId?: string | null, dayName?: string | null): string {
  const planName =
    planId && planId in PLAN_CONFIGS
      ? PLAN_CONFIGS[planId as PlanId].name
      : "your plan";
  const frequencyLabel = getPlanRecurringFrequencyLabel(planId);
  const dayLabel = formatRecurringDayLabel(dayName);

  if (dayLabel && frequencyLabel) {
    return `${planName} keeps you on ${dayLabel.toLowerCase()} with ${frequencyLabel.toLowerCase()}. Change the weekday here anytime.`;
  }
  if (frequencyLabel) {
    return `${planName} includes ${frequencyLabel.toLowerCase()}. Pick the weekday that works best for you.`;
  }
  return "Pick the weekday you want us each cycle. That day stays on your account until you change or cancel it.";
}
