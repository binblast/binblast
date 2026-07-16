import { formatCleaningDateForStorage } from "@/lib/cleaning-schedule";
import { getNextCleaningDate } from "@/lib/scheduling";

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
