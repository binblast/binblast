/**
 * Customer scheduling hours (Eastern Time).
 * - Sunday: closed
 * - Saturday: 8:00 AM – 2:00 PM
 * - Monday–Friday: 8:00 AM – 6:00 PM
 *
 * Initial booking lead window: customers must pick a date 3–5 days from today.
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

/** Earliest first booking: today + this many calendar days. */
export const MIN_BOOKING_LEAD_DAYS = 3;
/** Latest first booking: today + this many calendar days. */
export const MAX_BOOKING_LEAD_DAYS = 5;

export const BOOKING_WINDOW_COPY =
  "Please choose a date 3–5 days from today. Same-day and next-day bookings aren’t available.";

export function parseLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addCalendarDays(from: Date, days: number): Date {
  const next = startOfLocalDay(from);
  next.setDate(next.getDate() + days);
  return next;
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

export function getMinSelectableDate(fromDate: Date = new Date()): string {
  return formatDateInput(addCalendarDays(fromDate, MIN_BOOKING_LEAD_DAYS));
}

export function getMaxSelectableDate(fromDate: Date = new Date()): string {
  return formatDateInput(addCalendarDays(fromDate, MAX_BOOKING_LEAD_DAYS));
}

export function isDateSelectable(
  dateValue: string,
  minDate?: Date | string,
  maxDate?: Date | string
): boolean {
  if (!dateValue) return false;
  if (isSunday(dateValue)) return false;

  const date = startOfLocalDay(parseLocalDate(dateValue));

  const min =
    typeof minDate === "string"
      ? startOfLocalDay(parseLocalDate(minDate))
      : minDate
        ? startOfLocalDay(minDate)
        : startOfLocalDay(addCalendarDays(new Date(), MIN_BOOKING_LEAD_DAYS));

  if (date < min) return false;

  if (maxDate !== undefined) {
    const max =
      typeof maxDate === "string"
        ? startOfLocalDay(parseLocalDate(maxDate))
        : startOfLocalDay(maxDate);
    if (date > max) return false;
  }

  return true;
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

export function validateBookingLeadWindow(
  dateValue: string,
  fromDate: Date = new Date()
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

  if (!isDateSelectable(dateValue, getMinSelectableDate(fromDate), getMaxSelectableDate(fromDate))) {
    return {
      valid: false,
      error: BOOKING_WINDOW_COPY,
    };
  }

  return { valid: true };
}

export function validateBusinessSchedule(
  dateValue: string,
  timeWindow: string,
  options?: { enforceLeadWindow?: boolean; fromDate?: Date }
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

  if (options?.enforceLeadWindow) {
    const leadCheck = validateBookingLeadWindow(dateValue, options.fromDate);
    if (!leadCheck.valid) return leadCheck;
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

/** Public-facing hours copy for footer, chat, and marketing pages. */
export const BUSINESS_HOURS_LINES = [
  "Monday – Friday: 8:00 AM – 6:00 PM",
  "Saturday: 8:00 AM – 2:00 PM",
  "Sunday: Closed",
] as const;

export const BUSINESS_HOURS_DISPLAY =
  "Monday – Friday: 8:00 AM – 6:00 PM. Saturday: 8:00 AM – 2:00 PM. Sunday: closed.";
