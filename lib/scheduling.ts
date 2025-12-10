// lib/scheduling.ts

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

/**
 * Given a trash day (e.g. "Tuesday"), frequency and reference date,
 * return the next cleaning date on or after that reference date.
 */
export function getNextCleaningDate(
  trashDayOfWeek: string,
  frequency: Frequency,
  referenceDate: Date
): Date {
  const targetDow = DAY_MAP[trashDayOfWeek];
  if (targetDow === undefined) {
    throw new Error(`Invalid trashDayOfWeek: ${trashDayOfWeek}`);
  }

  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  // Move forward to the next correct day of week
  const currentDow = date.getDay();
  let diff = targetDow - currentDow;
  if (diff < 0) diff += 7; // move to next week if needed
  date.setDate(date.getDate() + diff);

  // Apply frequency
  if (frequency === "WEEKLY") {
    // nothing extra
  } else if (frequency === "BIWEEKLY") {
    // every 14 days from that aligned day
    if (diff === 0) {
      // same day → move 14 days ahead
      date.setDate(date.getDate() + 14);
    }
  } else if (frequency === "MONTHLY") {
    // assume once per month on that weekday, shift 28–31 days
    if (diff === 0) {
      // next month same weekday (roughly every 4 weeks)
      date.setDate(date.getDate() + 28);
    }
  }

  return date;
}

