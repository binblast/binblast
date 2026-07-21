/**
 * Customer scheduling hours (Eastern Time).
 * - Sunday: closed
 * - Saturday: 8:00 AM – 2:00 PM
 * - Monday–Friday: 8:00 AM – 6:00 PM
 */

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_TIME_SLOTS = [
  "8:00 AM - 12:00 PM",
  "12:00 PM - 3:00 PM",
  "3:00 PM - 6:00 PM",
] as const;

export const SATURDAY_TIME_SLOTS = [
  "8:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
] as const;

/** Legacy slots still stored on older bookings. */
export const LEGACY_TIME_SLOTS = [
  "6:00 AM - 9:00 AM",
  "9:00 AM - 12:00 PM",
  "12:00 PM - 3:00 PM",
  "3:00 PM - 6:00 PM",
  "Morning",
  "Afternoon",
  "Evening",
  "Any",
] as const;

export function parseLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayOfWeekName(dateValue: string): string {
  return DAY_NAMES[parseLocalDate(dateValue).getDay()];
}

export function isSunday(dateValue: string | Date): boolean {
  const date = typeof dateValue === "string" ? parseLocalDate(dateValue) : dateValue;
  return date.getDay() === 0;
}

export function isSaturday(dateValue: string | Date): boolean {
  const date = typeof dateValue === "string" ? parseLocalDate(dateValue) : dateValue;
  return date.getDay() === 6;
}

export function isDateSelectable(dateValue: string, minDate?: Date): boolean {
  if (!dateValue) return false;
  if (isSunday(dateValue)) return false;

  const date = parseLocalDate(dateValue);
  const min = minDate ? new Date(minDate) : new Date();
  min.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= min;
}

export function getTimeSlotsForDate(dateValue: string): string[] {
  if (!dateValue || isSunday(dateValue)) return [];
  if (isSaturday(dateValue)) return [...SATURDAY_TIME_SLOTS];
  return [...WEEKDAY_TIME_SLOTS];
}

export function normalizeTrashDay(trashDay: string): string {
  if (trashDay === "Sunday") return "Monday";
  return trashDay;
}

export function validateBusinessSchedule(
  dateValue: string,
  timeWindow: string
): { valid: boolean; error?: string } {
  if (!dateValue) {
    return { valid: false, error: "Please select a service date." };
  }

  if (isSunday(dateValue)) {
    return {
      valid: false,
      error: "We're closed on Sundays. Please choose another day.",
    };
  }

  const allowed = getTimeSlotsForDate(dateValue);
  if (!allowed.includes(timeWindow)) {
    return {
      valid: false,
      error: "Please choose a time window within our business hours for that day.",
    };
  }

  return { valid: true };
}

export function getBusinessHoursHint(dateValue: string): string {
  if (isSunday(dateValue)) return "Closed on Sundays.";
  if (isSaturday(dateValue)) return "Saturday hours: 8:00 AM – 2:00 PM ET.";
  return "Weekday hours: 8:00 AM – 6:00 PM ET.";
}

export function getMinSelectableDate(): string {
  return formatDateInput(new Date());
}

/** Public-facing hours copy for footer, chat, and marketing pages. */
export const BUSINESS_HOURS_LINES = [
  "Monday – Friday: 8:00 AM – 6:00 PM",
  "Saturday: 8:00 AM – 2:00 PM",
  "Sunday: Closed",
] as const;

export const BUSINESS_HOURS_DISPLAY =
  "Monday – Friday: 8:00 AM – 6:00 PM. Saturday: 8:00 AM – 2:00 PM. Sunday: closed.";
